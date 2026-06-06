import { Behavior, Component, ContextManager, Observable, started } from "@zcomponent/core";
import { EstuaryClient } from "@estuary-ai/sdk";

interface ConstructionProps {
	/** Automatically send the first message once the session is ready */
	autoSendOnConnect?: boolean;

	/** Brief settle pause after the session is ready, before sending the first message */
	delayBeforeFirstMessageSeconds?: number;

	/** Ask for a spoken (TTS) reply (false = text-only reply, no audio) */
	useTts?: boolean;

	/** Messages to send to the character (leave blank to skip) */
	message1?: string;
	message2?: string;
	message3?: string;
	message4?: string;
	message5?: string;
}

/**
 * @zbehavior
 * EXAMPLE: sends a text message to the character (as if the user typed it) and receives the
 * character's reply — either spoken (TTS) or text-only.
 *
 * Unlike ExampleSayLine (which makes the character say your exact words, skipping the LLM),
 * `sendText()` sends a user message and the character RESPONDS via the LLM. Toggle `useTts` to
 * choose a spoken reply (audio over LiveKit) or a text-only reply. Replies arrive on the
 * `botResponse` event (text, streamed) and, when `useTts` is on, as spoken audio.
 *
 * Edit the messages (and toggle TTS) right in the Properties panel — no code changes needed.
 * To send automatically on startup, turn ON `autoSendOnConnect` (it defaults to OFF).
 *
 * This behavior discovers the EstuaryClient via `window.__estuaryClient` (set by
 * EstuaryVoiceConnection on the root node), so attach it to ANY NON-ROOT node — never the root
 * Group node (that node is reserved for EstuaryVoiceConnection).
 *
 * Trigger messages at runtime from another behavior or the devtools console:
 *   window.__estuaryExampleSendText.sendNext()             // next message
 *   window.__estuaryExampleSendText.send("How are you?")   // any message
 **/
export class ExampleSendText extends Behavior<Component> {

	/**
	 * Automatically send the first message once the voice session is ready.
	 * @zui
	 * @zdefault false
	 */
	public autoSendOnConnect = new Observable<boolean>(false);

	/**
	 * A brief, natural pause AFTER the session is ready, before sending the first message.
	 * (Readiness is detected, not timed.)
	 * @zui
	 * @zdefault 2
	 */
	public delayBeforeFirstMessageSeconds = new Observable<number>(2);

	/**
	 * Ask for a spoken (TTS) reply. Turn off for a text-only reply (no audio) — the reply still
	 * arrives on the `botResponse` event.
	 * @zui
	 * @zdefault true
	 */
	public useTts = new Observable<boolean>(true);

	// ── Messages to send — edit these in the Properties panel ─────────────────────────────────
	// Each non-empty message, in order, is sent to the character as a user turn. `sendNext()`
	// advances through them one at a time. Leave a field blank to skip it.

	/**
	 * Message 1.
	 * @zui
	 * @zdefault "Hi! What's your name?"
	 */
	public message1 = new Observable<string>("Hi! What's your name?");

	/**
	 * Message 2.
	 * @zui
	 * @zdefault "What can you help me with today?"
	 */
	public message2 = new Observable<string>("What can you help me with today?");

	/**
	 * Message 3.
	 * @zui
	 * @zdefault "Tell me a quick fun fact."
	 */
	public message3 = new Observable<string>("Tell me a quick fun fact.");

	/**
	 * Message 4 (optional).
	 * @zui
	 * @zdefault ""
	 */
	public message4 = new Observable<string>("");

	/**
	 * Message 5 (optional).
	 * @zui
	 * @zdefault ""
	 */
	public message5 = new Observable<string>("");

	private client: EstuaryClient | null = null;
	private clientPollInterval: ReturnType<typeof setInterval> | null = null;
	private readyPollInterval: ReturnType<typeof setInterval> | null = null;
	private firstMessageTimer: ReturnType<typeof setTimeout> | null = null;
	private currentMessageIndex = 0;

	constructor(contextManager: ContextManager, instance: Component, protected constructorProps: ConstructionProps) {
		super(contextManager, instance);

		this.autoSendOnConnect.value = constructorProps.autoSendOnConnect ?? false;
		this.delayBeforeFirstMessageSeconds.value = constructorProps.delayBeforeFirstMessageSeconds ?? 2;
		this.useTts.value = constructorProps.useTts ?? true;
		this.message1.value = constructorProps.message1 ?? this.message1.value;
		this.message2.value = constructorProps.message2 ?? this.message2.value;
		this.message3.value = constructorProps.message3 ?? this.message3.value;
		this.message4.value = constructorProps.message4 ?? this.message4.value;
		this.message5.value = constructorProps.message5 ?? this.message5.value;

		started(this.contextManager).then(() => {
			(window as any).__estuaryExampleSendText = this;
			this._pollForClient();
		});
	}

	/**
	 * Collect the non-empty messages, in order, from the editable Properties-panel fields.
	 * Read at send-time (not cached) so edits made in the editor take effect immediately.
	 */
	private getMessages(): string[] {
		return [this.message1, this.message2, this.message3, this.message4, this.message5]
			.map((o) => o.value.trim())
			.filter((s) => s.length > 0);
	}

	/**
	 * The EstuaryClient is created asynchronously by EstuaryVoiceConnection once the experience
	 * launches and connects. Poll `window.__estuaryClient` until it appears, then wire up.
	 */
	private _pollForClient() {
		let attempts = 0;
		this.clientPollInterval = setInterval(() => {
			attempts++;
			const client = (window as any).__estuaryClient as EstuaryClient | undefined;
			if (client) {
				clearInterval(this.clientPollInterval!);
				this.clientPollInterval = null;
				this._onClientReady(client);
			} else if (attempts === 40) {
				console.warn(
					"[ExampleSendText] No window.__estuaryClient after ~10s. Make sure EstuaryVoiceConnection is " +
						"on the root node (with apiKey + characterId set) and this behavior is on a non-root node.",
				);
			}
		}, 250);
	}

	private _onClientReady(client: EstuaryClient) {
		this.client = client;

		// The character's reply arrives here. botResponse streams the text; we log the final reply.
		// When `useTts` is on, the reply is also spoken (audio over LiveKit in this template).
		client.on("botResponse", (r) => {
			if (r.isInterjection || !r.isFinal) return;
			console.log(`[ExampleSendText] Character replied: "${r.text}"`);
		});

		if (this.autoSendOnConnect.value) this._armFirstMessageWhenReady();
	}

	/**
	 * Wait until the session is actually ready, THEN send the first message after a brief settle
	 * delay.
	 *
	 * When `useTts` is on we wait for `client.isVoiceActive` (true only after the SDK has joined
	 * LiveKit and the gateway has enabled LiveKit audio) — otherwise the spoken reply's audio would
	 * be routed over Socket.IO and be silent in LiveKit mode. For a text-only reply, only the
	 * connection is required.
	 */
	private _armFirstMessageWhenReady() {
		const bufferMs = Math.max(0, this.delayBeforeFirstMessageSeconds.value * 1000);
		const wantsAudio = this.useTts.value;
		const startedWaiting = Date.now();
		const MAX_WAIT_MS = 20000;

		const isReady = () => {
			if (!this.client || !this.client.isConnected) return false;
			return wantsAudio ? this.client.isVoiceActive : true;
		};

		const sendSoon = () => {
			if (this.readyPollInterval) {
				clearInterval(this.readyPollInterval);
				this.readyPollInterval = null;
			}
			this.firstMessageTimer = setTimeout(() => {
				this.firstMessageTimer = null;
				this.sendNext();
			}, bufferMs);
		};

		if (isReady()) {
			sendSoon();
			return;
		}

		this.readyPollInterval = setInterval(() => {
			if (isReady()) {
				sendSoon();
			} else if (Date.now() - startedWaiting >= MAX_WAIT_MS) {
				console.warn("[ExampleSendText] Session not ready after 20s; sending anyway.");
				sendSoon();
			}
		}, 250);
	}

	/**
	 * Send the next message to the character, advancing a wrap-around cursor. Honors the `useTts`
	 * toggle (on = spoken reply, off = text-only reply).
	 */
	public sendNext() {
		if (!this.client) {
			console.warn("[ExampleSendText] Not connected yet.");
			return;
		}

		const messages = this.getMessages();
		if (messages.length === 0) {
			console.warn("[ExampleSendText] No messages set (all message1-5 fields are blank).");
			return;
		}

		const index = this.currentMessageIndex % messages.length;
		const message = messages[index];
		console.log(`[ExampleSendText] Sending: "${message}"`);
		this.client.sendText(message, !this.useTts.value);
		this.currentMessageIndex = (index + 1) % messages.length;
	}

	/**
	 * Send any arbitrary message to the character.
	 * @param text The message to send (as the user)
	 * @param textOnly Override the reply mode for this call. Defaults to the inverse of `useTts`.
	 */
	public send(text: string, textOnly?: boolean) {
		if (!this.client) {
			console.warn("[ExampleSendText] Not connected yet.");
			return;
		}
		console.log(`[ExampleSendText] Sending: "${text}"`);
		this.client.sendText(text, textOnly ?? !this.useTts.value);
	}

	/**
	 * Reset the cursor back to the first message (affects sendNext()).
	 */
	public resetMessages() {
		this.currentMessageIndex = 0;
	}

	dispose() {
		if (this.clientPollInterval) {
			clearInterval(this.clientPollInterval);
			this.clientPollInterval = null;
		}
		if (this.readyPollInterval) {
			clearInterval(this.readyPollInterval);
			this.readyPollInterval = null;
		}
		if (this.firstMessageTimer) {
			clearTimeout(this.firstMessageTimer);
			this.firstMessageTimer = null;
		}
		this.client = null;
		if ((window as any).__estuaryExampleSendText === this) {
			(window as any).__estuaryExampleSendText = null;
		}
		return super.dispose();
	}
}
