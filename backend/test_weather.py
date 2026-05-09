import asyncio
from app.weather import fetch_weather


async def main():
    data = await fetch_weather(33.9533, -117.3962)
    print(data)


if __name__ == "__main__":
    asyncio.run(main())