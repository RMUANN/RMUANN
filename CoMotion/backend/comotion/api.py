import uvicorn

from .app import create_app
from .config import Settings


settings = Settings.from_env()
app = create_app(settings=settings)


def main() -> None:
    uvicorn.run("comotion.api:app", host=settings.host, port=settings.port, reload=False)


if __name__ == "__main__":
    main()

