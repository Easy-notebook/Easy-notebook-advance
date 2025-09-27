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

        data = response.json()
        self.info(f"Generation: {data}")
        
        # Check if the response was successful
        if response.status_code != 200:
            self.error(f"API request failed with status {response.status_code}: {data}")
            raise Exception(f"Image generation failed: {data.get('message', 'Unknown error')}")
        
        # Check if the response has the expected structure
        if "data" not in data or not data["data"] or "url" not in data["data"][0]:
            self.error(f"Unexpected response structure: {data}")
            raise Exception("Image generation failed: Invalid response structure")
        
        return data["data"][0]["url"]


if __name__ == "__main__":
    t = Text2ImageAPI()
    t.generate_text2image("A beautiful sunset over mountains")

