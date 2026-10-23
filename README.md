# The Phone Heist

A browser-based educational game about phone security boundaries. Connect a fictional phone to a computer, choose how far to go, and learn what each action changes, what evidence it leaves, and whether it can be undone.

> This is a self-contained simulation. It does not connect to, inspect, or modify a real phone.

## Features

- Interactive phone and computer emulator
- Draggable cable and device-trust flow
- Five escalating gameplay rungs
- Teach me mode with guided highlights and clickable tasks
- Under the hood panel explaining the layers involved
- Optional boundary-crossing info cards with recovery guidance
- Multiple endings based on what the player actually did
- Local progress saved in the browser
- Self-hosted Fredoka and Nunito fonts

## Run locally

No dependencies or build step are required. From the repository root, start a local static server:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Link

To just play the game as is, go to: [https://github.com/acdu01/break-into-a-phone](https://github.com/acdu01/break-into-a-phone)


## Browser data

The game uses `localStorage` and `sessionStorage` for progress, settings, messages, notes, and uploaded-image previews. This data stays in the player's browser and is not sent to a server.

Use the in-game factory reset to clear the main sandbox state. Browser site-data controls can clear everything saved for the game.
