import asyncio
import websockets


async def echo(websocket, path):
    async for message in websocket:
        await websocket.send(f"Echo: {message}")


async def main():
    async with websockets.serve(echo, "localhost", 5000):
        print("WebSocket server listening on ws://localhost:5000")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
