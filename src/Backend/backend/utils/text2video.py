import requests
import time
from .logger import ModernLogger

class Text2VideoAPI(ModernLogger):
    def __init__(self, base_url: str = "https://api.aimlapi.com/v2"):
        super().__init__(name="Text2VideoAPI")
        self.api_key = "49cbbc30ad784ca9a62d416db2a50bff"
        self.base_url = base_url

    # Creating and sending a video generation task to the server
    def generate_video(self, prompt: str):
        url = f"{self.base_url}/generate/video/bytedance/generation"
        headers = {
            "Authorization": f"Bearer {self.api_key}", 
        }

        data = {
            "model": "bytedance/seedance-1-0-lite-t2v",
            "prompt": prompt,
            "resolution": "1080p"      
        }
    
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code >= 400:
            self.error(f"Error: {response.status_code} - {response.text}")
        else:
            response_data = response.json()
            self.info(response_data)
            return response_data
        

    # Requesting the result of the task from the server using the generation_id
    def get_video(self, gen_id):
        url = f"{self.base_url}/generate/video/bytedance/generation"
        params = {
            "generation_id": gen_id,
        }
        
        # Insert your AIML API Key instead of <YOUR_AIMLAPI_KEY>:
        headers = {
            "Authorization": f"Bearer {self.api_key}", 
            "Content-Type": "application/json"
            }

        response = requests.get(url, params=params, headers=headers)
        # print("Generation:", response.json())
        return response.json()



    def generate_video_and_get_result(self, prompt: str):
        # Running video generation and getting a task id
        gen_response = self.generate_video(prompt)
        gen_id = gen_response.get("id")
        self.info(f"Generation ID:  {gen_id}")

        # Trying to retrieve the video from the server every 10 sec
        if gen_id:
            start_time = time.time()

            timeout = 600
            while time.time() - start_time < timeout:
                response_data = self.get_video(gen_id)

                if response_data is None:
                    self.error("Error: No response from API")
                    break
            
                status = response_data.get("status")
                self.info(f"Status: {status}")

                if status == "waiting" or status == "active" or  status == "queued" or status == "generating":
                    self.info("Still waiting... Checking again in 10 seconds.")
                    time.sleep(10)
                else:
                    self.info(f"Processing complete:\n{response_data}")
                    return response_data["video"]["url"]
    
            self.error("Timeout reached. Stopping.")
            return None     


if __name__ == "__main__":
    v = Text2VideoAPI()
    print(v.generate_video_and_get_result("A beautiful sunset over mountains"))

