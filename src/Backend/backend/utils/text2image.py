import requests
from .logger import ModernLogger

class Text2ImageAPI(ModernLogger):
    def __init__(self, base_url: str = "https://api.aimlapi.com/v2"):
        super().__init__(name="Text2ImageAPI")
        self.api_key = "49cbbc30ad784ca9a62d416db2a50bff"
        self.base_url = base_url

    def generate_text2image(self,prompt: str):
        response = requests.post(
            "https://api.aimlapi.com/v1/images/generations",
            headers={
                # Insert your AIML API Key instead of <YOUR_AIMLAPI_KEY>:
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "prompt": prompt,
                "model": "bytedance/seedream-3.0",
                "size": "1888x301",
                "watermark": False
            }
        )

        # response.raise_for_status()
        data = response.json()
        self.info(f"Generation: {data}")
        return data["data"][0]["url"]


if __name__ == "__main__":
    t = Text2ImageAPI()
    t.generate_text2image("A beautiful sunset over mountains")

