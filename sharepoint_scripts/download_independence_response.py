import requests
from msal import ConfidentialClientApplication


"""
Download Independence_Response.json from SharePoint for an engagement/year.

NOTE:
- The config values (tenant_id, client_id, client_secret, site_hostname, site_path,
  doc_library, fy_year) should ultimately come from your database / API.
- This script is provided as a utility reference and is not wired into the Node.js API.
"""

# --- Config (replace with values from your database / API) ---
tenant_id = "114c8106-747f-4cc7-870e-8712e6c23b18"
client_id = "b357f50c-c5ef-484d-84df-fe470fe76528"
client_secret = "JAZ8Q~xlY-EDlgbLtgJaqjPNAjsHfYFavwxbkdjE"
site_hostname = "juggernautenterprises.sharepoint.com"
site_path = "/sites/TestCloud"
doc_library = "Test15"
fy_year = "Test15_FY25"

folder_name = "juggernaut"
file_name = "Independence_Response.json"
# Local path where the file will be saved; empty string means current directory + file_name
local_path = file_name


def main():
  # --- 1️⃣ Acquire token ---
  app = ConfidentialClientApplication(
    client_id,
    authority=f"https://login.microsoftonline.com/{tenant_id}",
    client_credential=client_secret,
  )

  token_response = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
  access_token = token_response.get("access_token")
  if not access_token:
    raise Exception("Failed to acquire access token")

  headers = {"Authorization": f"Bearer {access_token}"}

  # --- 2️⃣ Get site ID directly with hostname + path ---
  site_url = f"https://graph.microsoft.com/v1.0/sites/{site_hostname}:{site_path}"
  site_resp = requests.get(site_url, headers=headers)
  site_resp.raise_for_status()
  site_id = site_resp.json()["id"]

  # --- 3️⃣ Get drive ID once ---
  drives_resp = requests.get(
    f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives",
    headers=headers,
  )
  drives_resp.raise_for_status()
  drives = drives_resp.json()["value"]

  drive_id = next((d["id"] for d in drives if d["name"] == doc_library), None)
  if not drive_id:
    raise Exception(f"Library '{doc_library}' not found in site '{site_path}'")

  # --- 4️⃣ Stream download directly to file ---
  download_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{fy_year}/{folder_name}/{file_name}:/content"

  with requests.get(download_url, headers=headers, stream=True) as r:
    r.raise_for_status()
    with open(local_path, "wb") as f:
      for chunk in r.iter_content(chunk_size=8192):
        f.write(chunk)

  print(f"File downloaded successfully to: {local_path}")


if __name__ == "__main__":
  main()


