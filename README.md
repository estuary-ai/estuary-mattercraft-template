# Estuary Mattercraft Template

A [Mattercraft](https://docs.zap.works/mattercraft/) template for building voice-enabled WebAR characters powered by [Estuary](https://estuary-ai.com). Drop in your own 3D model, set your API key and character ID in the Properties panel, and publish.

**Try the live demo**

Scan with your phone to launch the [WebAR experience](https://webxr.run/bNalxng97ndnM)

<p align="center">
  <img src="estuary-mattercraft-template-qr.svg" alt="Scan to launch demo" width="200" />
</p>

## Prerequisites

- [Mattercraft](https://zap.works/mattercraft/) editor 
- An [Estuary](https://app.estuary-ai.com) account with:
  - An **API key** (starts with `est_`)
  - A **character ID** (created in the Estuary Configurator)
- A 3D character model in `.glb` format (a sample model is included)

## Quick Start

1. Open this project in Mattercraft
2. Select the **EstuaryVoiceConnection** behavior on the **root Group** node
3. In the Behavior panel, set your `apiKey` and `characterId`
4. Click **Preview** to test the experience, you should be able to start speaking to your character
5. Replace `3D Models/Axiom Wisp.glb` with your own character model
6. Attach or modify **SampleCharacterAnimator** to trigger your character's animations using Estuary actions
7. Publish when ready

## Project Structure

```
estuary-mattercraft-template/
├── index.ts                    # Entry point
├── index.html                  # HTML shell (launch + mute)
├── Scene.zcomp                 # Scene graph (JSON)
├── Scene.zcomp.d.ts            # Scene type declarations
├── EstuaryVoiceConnection.ts   # Voice connection behavior
├── SampleCharacterAnimator.ts  # Character animation behavior
├── ExampleSayLine.ts           # Scripted character speech example
├── ExampleSendText.ts          # Text-chat example (send a message, get a reply)
└── 3D Models/
    └── Axiom Wisp.glb          # Sample 3D character
```

## Behaviors

### EstuaryVoiceConnection

The core behavior. Manages the Estuary SDK connection, voice pipeline, microphone mute, and camera capture.

**Properties panel settings:**

| Property | Description | Default |
|---|---|---|
| `characterId` | Your Estuary character ID | `""` |
| `apiKey` | Your Estuary API key (`est_...`) | `""` |
| `playerId` | Unique identifier for the end user | `"player-1"` |
| `autoStartVoice` | Start voice automatically on connect | `true` |

**Read-only state** (available to other behaviors):

| Property | Description |
|---|---|
| `isConnected` | Whether the voice connection is active |
| `isSpeaking` | Whether the AI is currently speaking |
| `isListening` | Whether the user is currently speaking |
| `isMuted` | Whether the microphone is muted |

**Public methods** for programmatic control:

- `connect()` / `disconnect()` — manage connection
- `startVoice()` / `stopVoice()` — manage voice pipeline
- `toggleMute()` — toggle microphone
- `sendText(text, textOnly?)` — send a text message
- `interrupt(messageId?)` — interrupt the current response

### SampleCharacterAnimator

An example behavior demonstrating how to animate a 3D model in response to Estuary events. Replace or extend this for your own character.

**Animations:**

- **Idle bob** — gentle vertical oscillation
- **Speak pulse** — scale and emissive glow when the AI speaks
- **Swim-to-gaze** — moves toward camera during VLM capture requests
- **Follow/return** — responds to `follow_user` / `stop_following_user` character actions
- **Camera capture hide** — briefly hides during capture for clean VLM frames

All animation parameters (amplitude, speed, distances) are tunable via the Properties panel.

**Required character actions:** The sample animator listens for two character actions: `follow_user` and `stop_following_user`. You must add these actions to your character in the [Estuary Configurator](https://app.estuary-ai.com) for them to work.

### ExampleSayLine

An example behavior that demonstrates **scripted speech** — making the character say specific
prewritten lines via Estuary's say-line feature. The text goes straight to TTS (skipping the LLM)
but is still saved to the conversation history, so the character remembers it. Great for greetings,
tutorials, story beats, or NPC dialogue.

**Attach this behavior to a non-root node** (e.g. your model node). It finds the connection via
`window.__estuaryClient` and registers itself at `window.__estuaryExampleSayLine`.

**Properties panel settings** — edit what the character says, right in the editor:

| Property | Description | Default |
|---|---|---|
| `line1`–`line5` | The scripted lines, in order (leave a field blank to skip it) | sample shopkeeper lines |
| `useTts` | Speak the lines out loud with TTS audio (off = text only, no audio) | `true` |
| `autoSpeakOnConnect` | Speak the first scripted line once the voice session is ready (waits for LiveKit, not a fixed timer) | `false` |
| `delayBeforeFirstLineSeconds` | Brief settle pause after the session is ready, before the first line | `2` |

**Public methods** (call from another behavior, or from the browser devtools console):

- `sayNext()` — speak the next scripted line, advancing a wrap-around cursor (honors `useTts`)
- `sayTextOnly()` — speak a one-off silent text-only line (no audio)
- `say(text, textOnly?)` — speak any text
- `playFullScript()` — speak every scripted line in order, paced so they don't cut each other off (uses the SDK's `playScript()` sequencer)
- `resetLines()` — reset the cursor to the first line

Edit the `line1`–`line5` fields in the **Properties panel** to change what the character says (no
code changes needed). To try it from the browser console while previewing:

```js
window.__estuaryExampleSayLine.sayNext();        // one line at a time
window.__estuaryExampleSayLine.playFullScript(); // the whole script, in order
```

> Requires `@estuary-ai/sdk` ≥ 0.5.0 (for `playScript()`). `sayLine()` alone works on earlier versions.

### ExampleSendText

An example behavior that demonstrates **text chat** — sending a message to the character (as the
user) and getting the character's reply. Unlike `ExampleSayLine` (which makes the character say
your exact words), `sendText()` sends a user message and the character **responds** via the LLM.
Toggle `useTts` for a spoken reply (audio) or a text-only reply.

**Attach this behavior to a non-root node.** It finds the connection via `window.__estuaryClient`
and registers itself at `window.__estuaryExampleSendText`.

**Properties panel settings:**

| Property | Description | Default |
|---|---|---|
| `message1`–`message5` | The messages to send, in order (leave a field blank to skip it) | sample questions |
| `useTts` | Ask for a spoken (TTS) reply; off = text-only reply | `true` |
| `autoSendOnConnect` | Send the first message once the session is ready | `false` |
| `delayBeforeFirstMessageSeconds` | Settle pause after the session is ready, before the first message | `2` |

**Public methods** (call from another behavior, or from the browser devtools console):

- `sendNext()` — send the next message, advancing a wrap-around cursor (honors `useTts`)
- `send(text, textOnly?)` — send any message
- `resetMessages()` — reset the cursor to the first message

The character's reply arrives on the `botResponse` event (streamed text) and, when `useTts` is on,
as spoken audio over LiveKit. Try it from the console while previewing:

```js
window.__estuaryExampleSendText.send("What's your favorite thing to do?");
```

## Customization

### Using Your Own 3D Model

1. Replace `3D Models/Axiom Wisp.glb` with your `.glb` file
2. Update the model reference in `Scene.zcomp` via the Mattercraft editor
3. Modify `SampleCharacterAnimator` or write a new behavior for your character's animations

### Writing Custom Behaviors

Behaviors are TypeScript classes that attach to scene nodes:

```typescript
import { Component, Behavior, ContextManager, Observable, started } from "@zcomponent/core";

/**
 * @zbehavior
 * Description of your behavior
 **/
export class MyBehavior extends Behavior<Component> {

    /**
     * Exposed in the Properties panel
     * @zui
     * @zdefault 1.0
     */
    public speed = new Observable<number>(1.0);

    constructor(contextManager: ContextManager, instance: Component, constructorProps: {}) {
        super(contextManager, instance);
        started(this.contextManager).then(() => {
            // Initialize after AR experience launches
        });
    }

    dispose() {
        // Clean up resources
        return super.dispose();
    }
}
```

Key conventions:
- Mark with `@zbehavior` JSDoc tag
- Use `Observable<T>` with `@zui` to expose properties in the editor
- Access the Three.js Object3D via `(this.instance as any).element`
- Use `started(this.contextManager)` to wait for the AR experience to launch
- Always clean up in `dispose()`

### Accessing the Estuary Client

`EstuaryVoiceConnection` exposes the client on `window.__estuaryClient`. Other behaviors can poll for it:

```typescript
const interval = setInterval(() => {
    const client = (window as any).__estuaryClient;
    if (client) {
        clearInterval(interval);
        client.on("botResponse", (response) => { /* ... */ });
        client.on("characterAction", (action) => { /* ... */ });
    }
}, 250);
```

## Features

- **Voice conversation** — real-time speech-to-text and text-to-speech via LiveKit/WebSocket
- **Scripted lines** — make the character speak exact prewritten dialogue with `ExampleSayLine` (greetings, tutorials, cutscenes)
- **Text chat** — send the character a message and get a text or spoken reply with `ExampleSendText`
- **Vision (VLM)** — character can request and process camera images. Try asking your character what it thinks about what you're looking at!
- **Persistent memory** — character can remember conversations across sessions, configurable in Estuary Configurator
- **Mute control** — built-in microphone mute button in the HTML overlay
- **Auto-reconnect** — handles connection drops gracefully
- **Character actions** — respond to structured actions from the AI (e.g., follow, stop)

## Important Notes

- **Browser requirements** — WebSocket, Web Audio API, and microphone permission. Camera access needed for VLM features.

## Resources

- [Estuary Configurator](https://app.estuary-ai.com)
- [Mattercraft Documentation](https://docs.zap.works/mattercraft/)
- [Estuary SDK on npm](https://www.npmjs.com/package/@estuary-ai/sdk)
