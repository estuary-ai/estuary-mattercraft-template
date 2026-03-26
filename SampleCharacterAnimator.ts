import { Component, Behavior, ContextManager, Observable, started } from "@zcomponent/core";
import { EstuaryClient } from "@estuary-ai/sdk";
import type { CharacterAction, CameraCaptureRequest, InterruptData } from "@estuary-ai/sdk";
import { Vector3, Quaternion, MeshStandardMaterial, Mesh, Object3D, MathUtils, Color } from "three";

type AnimationState = "idle" | "swimming_to_gaze" | "following_user" | "returning";

interface ConstructionProps {
	bobAmplitude?: number;
	bobSpeed?: number;
	pulseAmplitude?: number;
	pulseSpeed?: number;
	glowIntensity?: number;
	glowSpeed?: number;
	swimSpeed?: number;
	swimDistance?: number;
	gazeLinger?: number;
	waddleAmplitude?: number;
	waddleSpeed?: number;
}

/**
 * @zbehavior
 * Animates a 3D character with idle bob, swim-to-gaze, and talk pulse behaviors.
 * Subscribes to EstuaryClient events via window.__estuaryClient.
 * Replace or extend this behavior for your own character.
 **/
export class SampleCharacterAnimator extends Behavior<Component> {

	// ─── Tunable constants (exposed as @zui Observables) ────────────

	/**
	 * Y oscillation range in meters
	 * @zui
	 * @zdefault 0.05
	 */
	public bobAmplitude = new Observable<number>(0.05);

	/**
	 * Oscillation frequency
	 * @zui
	 * @zdefault 0.8
	 */
	public bobSpeed = new Observable<number>(0.8);

	/**
	 * Scale oscillation range when speaking
	 * @zui
	 * @zdefault 0.03
	 */
	public pulseAmplitude = new Observable<number>(0.03);

	/**
	 * Scale pulse frequency
	 * @zui
	 * @zdefault 3.0
	 */
	public pulseSpeed = new Observable<number>(3.0);

	/**
	 * Peak emissive intensity when speaking
	 * @zui
	 * @zdefault 0.35
	 */
	public glowIntensity = new Observable<number>(0.35);

	/**
	 * Emissive pulse frequency
	 * @zui
	 * @zdefault 2.5
	 */
	public glowSpeed = new Observable<number>(2.5);

	/**
	 * Lerp speed for swim movement
	 * @zui
	 * @zdefault 2.0
	 */
	public swimSpeed = new Observable<number>(2.0);

	/**
	 * Distance in front of camera to swim to (meters)
	 * @zui
	 * @zdefault 1.5
	 */
	public swimDistance = new Observable<number>(1.5);

	/**
	 * Seconds to linger at gaze point after speech ends before returning
	 * @zui
	 * @zdefault 2.0
	 */
	public gazeLinger = new Observable<number>(2.0);

	/**
	 * Yaw oscillation amplitude in radians when following
	 * @zui
	 * @zdefault 0.03
	 */
	public waddleAmplitude = new Observable<number>(0.3);

	/**
	 * Lateral sway oscillation frequency when following
	 * @zui
	 * @zdefault 3.0
	 */
	public waddleSpeed = new Observable<number>(3.0);

	/**
	 * Rotation interpolation speed when turning to face camera
	 * @zui
	 * @zdefault 2.0
	 */
	public turnSpeed = new Observable<number>(2.0);

	// ─── Private state ──────────────────────────────────────────────

	private _state: AnimationState = "idle";
	private _isSpeaking = false;
	private _audioLevel = 0; // 0..1 from botAudioLevel events
	private _previousState: AnimationState = "idle";
	private _speakingBlend = 0; // 0..1, for smooth fade in/out of speak effects
	private _rotationBlend = 0; // 0..1, slower blend for smooth rotation toward camera

	private _homePosition = new Vector3();
	private _targetPosition = new Vector3();
	private _baseScale = new Vector3();

	private _materials: MeshStandardMaterial[] = [];
	private _camera: Object3D | null = null;

	private _animFrameId: number | null = null;
	private _lastTime = 0;
	private _lingerTimer: ReturnType<typeof setTimeout> | null = null;
	private _clientPollInterval: ReturnType<typeof setInterval> | null = null;
	private _client: EstuaryClient | null = null;

	// Bound event handlers for cleanup
	private _boundOnCharacterAction: ((action: CharacterAction) => void) | null = null;
	private _boundOnCameraCaptureRequest: ((req: CameraCaptureRequest) => void) | null = null;
	private _boundOnAudioPlaybackStarted: ((messageId: string) => void) | null = null;
	private _boundOnAudioPlaybackComplete: ((messageId: string) => void) | null = null;
	private _boundOnInterrupt: ((data: InterruptData) => void) | null = null;
	private _boundOnBotAudioLevel: ((level: number) => void) | null = null;

	// Reusable temporaries (avoid per-frame allocations)
	private _tmpVec = new Vector3();
	private _tmpQuat = new Quaternion();
	private _tmpForward = new Vector3();
	private _tmpGazeTarget = new Vector3();
	private _swimQuat = new Quaternion();

	constructor(contextManager: ContextManager, instance: Component, protected constructorProps: ConstructionProps) {
		super(contextManager, instance);

		// Apply constructor props
		if (constructorProps.bobAmplitude !== undefined) this.bobAmplitude.value = constructorProps.bobAmplitude;
		if (constructorProps.bobSpeed !== undefined) this.bobSpeed.value = constructorProps.bobSpeed;
		if (constructorProps.pulseAmplitude !== undefined) this.pulseAmplitude.value = constructorProps.pulseAmplitude;
		if (constructorProps.pulseSpeed !== undefined) this.pulseSpeed.value = constructorProps.pulseSpeed;
		if (constructorProps.glowIntensity !== undefined) this.glowIntensity.value = constructorProps.glowIntensity;
		if (constructorProps.glowSpeed !== undefined) this.glowSpeed.value = constructorProps.glowSpeed;
		if (constructorProps.swimSpeed !== undefined) this.swimSpeed.value = constructorProps.swimSpeed;
		if (constructorProps.swimDistance !== undefined) this.swimDistance.value = constructorProps.swimDistance;
		if (constructorProps.gazeLinger !== undefined) this.gazeLinger.value = constructorProps.gazeLinger;
		if (constructorProps.waddleAmplitude !== undefined) this.waddleAmplitude.value = constructorProps.waddleAmplitude;
		if (constructorProps.waddleSpeed !== undefined) this.waddleSpeed.value = constructorProps.waddleSpeed;

		started(this.contextManager).then(() => {
			this._initialize();
		});
	}

	// ─── Initialization ─────────────────────────────────────────────

	/** Access the underlying Three.js Object3D via Mattercraft's .element property */
	private get _obj(): Object3D {
		return (this.instance as any).element as Object3D;
	}

	private _initialize(): void {
		// Capture home position and base scale after entityProps have been applied
		const obj = this._obj;
		this._homePosition.copy(obj.position);
		this._baseScale.copy(obj.scale);

		this._cacheMaterials();
		this._camera = this._findCamera();

		if (!this._camera) {
			console.warn("SampleCharacterAnimator: Could not find camera in scene");
		}

		// Poll for the EstuaryClient exposed on window by EstuaryVoiceConnection
		this._clientPollInterval = setInterval(() => {
			const client = (window as any).__estuaryClient as EstuaryClient | undefined;
			if (client) {
				clearInterval(this._clientPollInterval!);
				this._clientPollInterval = null;
				this._subscribeToClient(client);
			}
		}, 250);

		// Start the animation loop
		this._lastTime = performance.now();
		this._animFrameId = requestAnimationFrame(this._animateFrame);
	}

	private _subscribeToClient(client: EstuaryClient): void {
		this._client = client;

		this._boundOnCharacterAction = (action) => this._onCharacterAction(action);
		this._boundOnCameraCaptureRequest = (req) => this._onCameraCaptureRequest(req);
		this._boundOnAudioPlaybackStarted = () => this._onAudioPlaybackStarted();
		this._boundOnAudioPlaybackComplete = () => this._onAudioPlaybackComplete();
		this._boundOnInterrupt = () => this._onInterrupt();
		this._boundOnBotAudioLevel = (level: number) => { this._audioLevel = level; };

		client.on("characterAction", this._boundOnCharacterAction);
		client.on("cameraCaptureRequest", this._boundOnCameraCaptureRequest);
		client.on("audioPlaybackStarted", this._boundOnAudioPlaybackStarted);
		client.on("audioPlaybackComplete", this._boundOnAudioPlaybackComplete);
		client.on("interrupt", this._boundOnInterrupt);
		client.on("botAudioLevel", this._boundOnBotAudioLevel);

		console.log("SampleCharacterAnimator: Subscribed to EstuaryClient events");
	}

	// ─── Scene helpers ──────────────────────────────────────────────

	private _findCamera(): Object3D | null {
		const obj = this._obj;

		// Traverse up to scene root
		let root: Object3D = obj;
		while (root.parent) {
			root = root.parent;
		}

		// Find the camera in the scene graph
		let camera: Object3D | null = null;
		root.traverse((child) => {
			if ((child as any).isCamera && !camera) {
				camera = child;
			}
		});

		return camera;
	}

	private _cacheMaterials(): void {
		const obj = this._obj;
		this._materials = [];

		obj.traverse((child) => {
			if ((child as any).isMesh) {
				const mesh = child as Mesh;
				const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
				for (const mat of mats) {
					if (mat instanceof MeshStandardMaterial) {
						// Ensure emissive color is non-black so intensity has visible effect
						if (mat.emissive.getHex() === 0x000000) {
							mat.emissive = new Color(0xff8833);
						}
						mat.emissiveIntensity = 0;
						this._materials.push(mat);
					}
				}
			}
		});

		console.log(`SampleCharacterAnimator: Cached ${this._materials.length} materials`);
	}

	/** Computes the gaze target in the Wisp parent's local space. Zero-allocation. */
	private _computeGazeTarget(): Vector3 {
		if (!this._camera) {
			return this._tmpGazeTarget.copy(this._homePosition);
		}

		this._camera.getWorldPosition(this._tmpVec);
		this._camera.getWorldQuaternion(this._tmpQuat);

		this._tmpForward.set(0, 0, -1).applyQuaternion(this._tmpQuat);

		this._tmpGazeTarget
			.copy(this._tmpVec)
			.add(this._tmpForward.multiplyScalar(this.swimDistance.value));

		// Convert world target to local space (relative to the Wisp's parent)
		const obj = this._obj;
		if (obj.parent) {
			obj.parent.worldToLocal(this._tmpGazeTarget);
		}

		return this._tmpGazeTarget;
	}

	// ─── Animation loop ─────────────────────────────────────────────

	private _animateFrame = (time: number): void => {
		if (this._animFrameId === null) return; // disposed
		this._animate(time);
		this._animFrameId = requestAnimationFrame(this._animateFrame);
	};

	private _animate(time: number): void {
		const dt = Math.min((time - this._lastTime) / 1000, 0.1); // cap delta to avoid jumps
		this._lastTime = time;

		const obj = this._obj;
		const timeSec = time / 1000;

		// ── Idle bob (active in ALL states) ──
		const bobOffset = Math.sin(timeSec * this.bobSpeed.value) * this.bobAmplitude.value;

		// ── State-based position ──
		switch (this._state) {
			case "idle": {
				obj.position.x = this._homePosition.x;
				obj.position.y = this._homePosition.y + bobOffset;
				obj.position.z = this._homePosition.z;
				break;
			}

			case "swimming_to_gaze": {
				const lerpFactor = 1 - Math.exp(-this.swimSpeed.value * dt);
				obj.position.x = MathUtils.lerp(obj.position.x, this._targetPosition.x, lerpFactor);
				obj.position.y = MathUtils.lerp(obj.position.y, this._targetPosition.y + bobOffset, lerpFactor);
				obj.position.z = MathUtils.lerp(obj.position.z, this._targetPosition.z, lerpFactor);

				// Smooth rotation: face away from camera (toward gaze object)
				if (this._camera) {
					// Compute target orientation
					this._camera.getWorldPosition(this._tmpVec);
					if (obj.parent) obj.parent.worldToLocal(this._tmpVec);
					obj.lookAt(this._tmpVec);
					obj.rotateY(Math.PI);
					this._tmpQuat.copy(obj.quaternion); // target quat

					// Slerp the clean base orientation toward target
					this._swimQuat.slerp(this._tmpQuat, lerpFactor);
					obj.quaternion.copy(this._swimQuat);
				}

				// Waddle while swimming (applied on top, never fed back into _swimQuat)
				const waddleAngle = Math.sin(timeSec * this.waddleSpeed.value) * this.waddleAmplitude.value;
				obj.rotateY(waddleAngle);
				break;
			}

			case "following_user": {
				this._targetPosition.copy(this._computeGazeTarget());
				const followLerp = 1 - Math.exp(-this.swimSpeed.value * dt);
				obj.position.x = MathUtils.lerp(obj.position.x, this._targetPosition.x, followLerp);
				obj.position.y = MathUtils.lerp(obj.position.y, this._targetPosition.y + bobOffset, followLerp);
				obj.position.z = MathUtils.lerp(obj.position.z, this._targetPosition.z, followLerp);

				// Base orientation: face camera
				if (this._camera) {
					this._camera.getWorldPosition(this._tmpVec);
					if (obj.parent) obj.parent.worldToLocal(this._tmpVec);
					obj.lookAt(this._tmpVec);
				}
				// Fish-like side-to-side waddle (yaw oscillation)
				const waddleAngle = Math.sin(timeSec * this.waddleSpeed.value) * this.waddleAmplitude.value;
				obj.rotateY(waddleAngle);
				break;
			}

			case "returning": {
				const returnLerp = 1 - Math.exp(-this.swimSpeed.value * dt);
				obj.position.x = MathUtils.lerp(obj.position.x, this._homePosition.x, returnLerp);
				obj.position.y = MathUtils.lerp(obj.position.y, this._homePosition.y + bobOffset, returnLerp);
				obj.position.z = MathUtils.lerp(obj.position.z, this._homePosition.z, returnLerp);

				// Check if arrived at home
				const distSq =
					(obj.position.x - this._homePosition.x) ** 2 +
					(obj.position.z - this._homePosition.z) ** 2;
				if (distSq < 0.0001) {
					this._state = "idle";
				}
				break;
			}
		}

		// ── Speaking blend (smooth in/out) ──
		const targetBlend = this._isSpeaking ? 1 : 0;
		this._speakingBlend = MathUtils.lerp(this._speakingBlend, targetBlend, 1 - Math.exp(-5 * dt));

		// Clamp very small values to zero for clean idle
		if (this._speakingBlend < 0.001) this._speakingBlend = 0;

		// Rotation blend: same target as speaking blend, but slower for smooth turns
		const rotTarget = this._isSpeaking ? 1 : 0;
		this._rotationBlend = MathUtils.lerp(this._rotationBlend, rotTarget, 1 - Math.exp(-this.turnSpeed.value * dt));
		if (this._rotationBlend < 0.001) this._rotationBlend = 0;

		// ── Look at camera when speaking ──
		if (this._rotationBlend > 0 && this._camera && this._state !== "following_user") {
			this._camera.getWorldPosition(this._tmpVec);
			if (obj.parent) {
				obj.parent.worldToLocal(this._tmpVec);
			}
			this._tmpQuat.copy(obj.quaternion);
			obj.lookAt(this._tmpVec);
			obj.quaternion.slerp(this._tmpQuat, 1 - this._rotationBlend);
		}

		// ── Scale pulse ──
		if (this._speakingBlend > 0) {
			const pulseOffset = Math.sin(timeSec * this.pulseSpeed.value) * this.pulseAmplitude.value * this._speakingBlend;
			obj.scale.set(
				this._baseScale.x + pulseOffset,
				this._baseScale.y + pulseOffset,
				this._baseScale.z + pulseOffset,
			);
		} else {
			obj.scale.set(this._baseScale.x, this._baseScale.y, this._baseScale.z);
		}

		// ── Emissive glow ──
		if (this._speakingBlend > 0) {
			// Use real audio level when available, sine-wave fallback when not
			const rawGlow = this._audioLevel > 0
				? this._audioLevel
				: (Math.sin(timeSec * this.glowSpeed.value) * 0.5 + 0.5);
			const glowValue = rawGlow * this.glowIntensity.value * this._speakingBlend;
			for (const mat of this._materials) {
				mat.emissiveIntensity = glowValue;
			}
		} else {
			for (const mat of this._materials) {
				mat.emissiveIntensity = 0;
			}
		}

	}

	// ─── Event handlers ─────────────────────────────────────────────

	private _onCameraCaptureRequest(_req: CameraCaptureRequest): void {
		// Hide character so camera capture gets only the real-world view
		const obj = this._obj;
		obj.visible = false;
		setTimeout(() => { obj.visible = true; }, 100);

		// Save current state so we can resume after VLM completes
		if (this._state !== "swimming_to_gaze") {
			this._previousState = this._state;
		}
		this._targetPosition.copy(this._computeGazeTarget());
		this._swimQuat.copy(this._obj.quaternion);
		this._state = "swimming_to_gaze";
		console.log("SampleCharacterAnimator: Swimming to gaze (camera capture)");
	}

	private _onCharacterAction(action: CharacterAction): void {
		switch (action.name) {
			case "follow_user":
				this._state = "following_user";
				console.log("SampleCharacterAnimator: Following user");
				break;

			case "stop_following_user":
				this._state = "returning";
				console.log("SampleCharacterAnimator: Returning to home");
				break;
		}
	}

	private _onAudioPlaybackStarted(): void {
		this._isSpeaking = true;
	}

	private _onAudioPlaybackComplete(): void {
		this._isSpeaking = false;
		this._audioLevel = 0;

		if (this._state === "swimming_to_gaze") {
			this._lingerTimer = setTimeout(() => {
				this._lingerTimer = null;
				if (this._state === "swimming_to_gaze") {
					if (this._previousState === "following_user") {
						this._state = "following_user";
						console.log("SampleCharacterAnimator: Linger complete, resuming follow");
					} else {
						this._homePosition.copy(this._obj.position);
						this._state = "idle";
						console.log("SampleCharacterAnimator: Linger complete, staying at gaze target");
					}
				}
			}, this.gazeLinger.value * 1000);
		}
	}

	private _onInterrupt(): void {
		this._isSpeaking = false;
		this._audioLevel = 0;
		if (this._lingerTimer) {
			clearTimeout(this._lingerTimer);
			this._lingerTimer = null;
		}

		if (this._state === "swimming_to_gaze") {
			if (this._previousState === "following_user") {
				this._state = "following_user";
				console.log("SampleCharacterAnimator: Interrupted, resuming follow");
			} else {
				this._homePosition.copy(this._obj.position);
				this._state = "idle";
				console.log("SampleCharacterAnimator: Interrupted, staying at current position");
			}
		}
	}

	// ─── Dispose ────────────────────────────────────────────────────

	dispose() {
		// Cancel animation loop
		if (this._animFrameId !== null) {
			cancelAnimationFrame(this._animFrameId);
			this._animFrameId = null;
		}

		// Clear linger timer
		if (this._lingerTimer !== null) {
			clearTimeout(this._lingerTimer);
			this._lingerTimer = null;
		}

		// Clear polling interval
		if (this._clientPollInterval !== null) {
			clearInterval(this._clientPollInterval);
			this._clientPollInterval = null;
		}

		// Unsubscribe from client events
		if (this._client) {
			if (this._boundOnCharacterAction) this._client.off("characterAction", this._boundOnCharacterAction);
			if (this._boundOnCameraCaptureRequest) this._client.off("cameraCaptureRequest", this._boundOnCameraCaptureRequest);
			if (this._boundOnAudioPlaybackStarted) this._client.off("audioPlaybackStarted", this._boundOnAudioPlaybackStarted);
			if (this._boundOnAudioPlaybackComplete) this._client.off("audioPlaybackComplete", this._boundOnAudioPlaybackComplete);
			if (this._boundOnInterrupt) this._client.off("interrupt", this._boundOnInterrupt);
			if (this._boundOnBotAudioLevel) this._client.off("botAudioLevel", this._boundOnBotAudioLevel);
			this._client = null;
		}

		// Reset emissive intensity
		for (const mat of this._materials) {
			mat.emissiveIntensity = 0;
		}
		this._materials = [];

		return super.dispose();
	}
}
