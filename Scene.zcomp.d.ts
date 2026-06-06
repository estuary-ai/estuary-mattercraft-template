import { ZComponent, ContextManager, Observable, Animation, Layer, LayerClip, Event, ConstructorForComponent } from "@zcomponent/core";

import { GLTF as GLTF_0 } from "@zcomponent/three/lib/components/models/GLTF";
import { SampleCharacterAnimator as SampleCharacterAnimator_1 } from "./SampleCharacterAnimator";
import { ExampleSayLine as ExampleSayLine_2 } from "./ExampleSayLine";
import { ExampleSendText as ExampleSendText_3 } from "./ExampleSendText";
import { CameraEnvironmentMap as CameraEnvironmentMap_4 } from "@zcomponent/zappar-three/lib/components/environments/CameraEnvironmentMap";
import { DefaultCookieConsent as DefaultCookieConsent_5 } from "@zcomponent/core/lib/components/DefaultCookieConsent";
import { DefaultLoader as DefaultLoader_6 } from "@zcomponent/core/lib/components/DefaultLoader";
import { Group as Group_7 } from "@zcomponent/three/lib/components/Group";
import { DirectionalLight as DirectionalLight_8 } from "@zcomponent/three/lib/components/lights/DirectionalLight";
import { ShadowPlane as ShadowPlane_9 } from "@zcomponent/three/lib/components/meshes/ShadowPlane";
import { UserPlacementAnchorGroup as UserPlacementAnchorGroup_10 } from "@zcomponent/zappar-three/lib/components/anchorgroups/UserPlacementAnchorGroup";
import { WorldTracker as WorldTracker_11 } from "@zcomponent/zappar-three/lib/components/trackers/WorldTracker";
import { WorldTrackingUI as WorldTrackingUI_12 } from "@zcomponent/zappar-three/lib/components/WorldTrackingUI";
import { ZapparCamera as ZapparCamera_13 } from "@zcomponent/zappar-three/lib/components/cameras/Camera";

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
				0: SampleCharacterAnimator_1,
				1: ExampleSayLine_2,
				ExampleSayLine: ExampleSayLine_2,
				2: ExampleSendText_3,
				ExampleSendText: ExampleSendText_3,
			}
		},
		CameraEnvironmentMap: CameraEnvironmentMap_4 & {
			behaviors: {

			}
		},
		DefaultCookieConsent: DefaultCookieConsent_5 & {
			behaviors: {

			}
		},
		DefaultLoader: DefaultLoader_6 & {
			behaviors: {

			}
		},
		Defaults: Group_7 & {
			behaviors: {

			}
		},
		DirectionalLight: DirectionalLight_8 & {
			behaviors: {

			}
		},
		ShadowPlane: ShadowPlane_9 & {
			behaviors: {

			}
		},
		UserPlacementAnchorGroup: UserPlacementAnchorGroup_10 & {
			behaviors: {

			}
		},
		WorldTracker: WorldTracker_11 & {
			behaviors: {

			}
		},
		WorldTrackingUI: WorldTrackingUI_12 & {
			behaviors: {

			}
		},
		ZapparCamera: ZapparCamera_13 & {
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
