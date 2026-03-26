import { ZComponent, ContextManager, Observable, Animation, Layer, LayerClip, Event, ConstructorForComponent } from "@zcomponent/core";

import { GLTF as GLTF_0 } from "@zcomponent/three/lib/components/models/GLTF";
import { EstuaryVoiceConnection as EstuaryVoiceConnection_1 } from "./EstuaryVoiceConnection";
import { SampleCharacterAnimator as SampleCharacterAnimator_2 } from "./SampleCharacterAnimator";
import { CameraEnvironmentMap as CameraEnvironmentMap_3 } from "@zcomponent/zappar-three/lib/components/environments/CameraEnvironmentMap";
import { DefaultCookieConsent as DefaultCookieConsent_4 } from "@zcomponent/core/lib/components/DefaultCookieConsent";
import { DefaultLoader as DefaultLoader_5 } from "@zcomponent/core/lib/components/DefaultLoader";
import { Group as Group_6 } from "@zcomponent/three/lib/components/Group";
import { DirectionalLight as DirectionalLight_7 } from "@zcomponent/three/lib/components/lights/DirectionalLight";
import { ShadowPlane as ShadowPlane_8 } from "@zcomponent/three/lib/components/meshes/ShadowPlane";
import { UserPlacementAnchorGroup as UserPlacementAnchorGroup_9 } from "@zcomponent/zappar-three/lib/components/anchorgroups/UserPlacementAnchorGroup";
import { WorldTracker as WorldTracker_10 } from "@zcomponent/zappar-three/lib/components/trackers/WorldTracker";
import { WorldTrackingUI as WorldTrackingUI_11 } from "@zcomponent/zappar-three/lib/components/WorldTrackingUI";
import { ZapparCamera as ZapparCamera_12 } from "@zcomponent/zappar-three/lib/components/cameras/Camera";

interface ConstructorProps {

}

/**
* @zcomponent
* @zicon zcomponent
* @ztag zcomponent
*/
declare class Comp extends ZComponent {

	constructor(contextManager: ContextManager, constructorProps: ConstructorProps);

	nodes: {
		Axiom_Wisp_glb: GLTF_0 & {
			behaviors: {
				0: EstuaryVoiceConnection_1,
				1: SampleCharacterAnimator_2,
			}
		},
		CameraEnvironmentMap: CameraEnvironmentMap_3 & {
			behaviors: {

			}
		},
		DefaultCookieConsent: DefaultCookieConsent_4 & {
			behaviors: {

			}
		},
		DefaultLoader: DefaultLoader_5 & {
			behaviors: {

			}
		},
		Defaults: Group_6 & {
			behaviors: {

			}
		},
		DirectionalLight: DirectionalLight_7 & {
			behaviors: {

			}
		},
		ShadowPlane: ShadowPlane_8 & {
			behaviors: {

			}
		},
		UserPlacementAnchorGroup: UserPlacementAnchorGroup_9 & {
			behaviors: {

			}
		},
		WorldTracker: WorldTracker_10 & {
			behaviors: {

			}
		},
		WorldTrackingUI: WorldTrackingUI_11 & {
			behaviors: {

			}
		},
		ZapparCamera: ZapparCamera_12 & {
			behaviors: {

			}
		},
	};

	animation: Animation & { layers: {

	}};

	/**
	 * The position, in 3D space, of this node relative to its parent. The three elements of the array correspond to the `x`, `y`, and `z` components of position.
	 * 
	 * @zprop
	 * @zdefault [0,0,0]
	 * @zgroup Transform
	 * @zgrouppriority 10
	 */
	public position: Observable<[x: number, y: number, z: number]>;

	/**
	 * The rotation, in three dimensions, of this node relative to its parent. The three elements of the array correspond to Euler angles - yaw, pitch and roll.
	 * 
	 * @zprop
	 * @zdefault [0,0,0]
	 * @zgroup Transform
	 * @zgrouppriority 10
	 */
	public rotation: Observable<[x: number, y: number, z: number]>;

	/**
	 * The scale, in three dimensions, of this node relative to its parent. The three elements of the array correspond to scales in the the `x`, `y`, and `z` axis.
	 * 
	 * @zprop
	 * @zdefault [1,1,1]
	 * @zgroup Transform
	 * @zgrouppriority 10
	 */
	public scale: Observable<[x: number, y: number, z: number]>;

	/**
	 * Determines if this object and its children are rendered to the screen.
	 * 
	 * @zprop
	 * @zdefault true
	 * @zgroup Appearance
	 * @zgrouppriority 11
	 */
	public visible: Observable<boolean>;
}

export default Comp;
