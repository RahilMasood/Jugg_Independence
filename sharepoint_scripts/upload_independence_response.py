import requests
from msal import ConfidentialClientApplication
import json
import os


"""
Upload a file to SharePoint and update db.json with concurrency-safe merge.

NOTE:
- This is a utility script, adapted from your provided example.
- The config values (tenant_id, client_id, client_secret, site_name, doc_library, fy_year)
  should come from your database / API in production.
"""

# === CONFIG (replace with values from your DB / API) ===
tenant_id = "114c8106-747f-4cc7-870e-8712e6c23b18"
client_id = "b357f50c-c5ef-484d-84df-fe470fe76528"
client_secret = "JAZ8Q~xlY-EDlgbLtgJaqjPNAjsHfYFavwxbkdjE"
site_name = "TestCloud"
doc_library = "TestClient"   # Document library you want to use
fy_year = "TestClient_FY25"


def jugg(file_path, reference_value, folder_name, fy_year_value, section_list):
  """
  Uploads a file to SharePoint, updates db.json safely with concurrency protection.

  Features:
  - Uses ETag + If-Match to prevent overwriting someone else's changes
  - Auto re-merge on conflict (412)
  - Per-entry merge (not full overwrite)
  """

  # === Get access token ===
  app = ConfidentialClientApplication(
    client_id,
    authority=f"https://login.microsoftonline.com/{tenant_id}",
    client_credential=client_secret,
  )

  token_response = app.acquire_token_for_client(
    scopes=["https://graph.microsoft.com/.default"]
  )

  access_token = token_response.get("access_token")
  if not access_token:
    raise Exception("Failed to acquire access token")

  headers = {"Authorization": f"Bearer {access_token}"}

  # === Get site ID ===
  target_file_name = os.path.basename(file_path)

  site_resp = requests.get(
    f"https://graph.microsoft.com/v1.0/sites/juggernautenterprises.sharepoint.com:/sites/{site_name}",
    headers=headers,
  )
  site_resp.raise_for_status()
  site_id = site_resp.json()["id"]

  # === Get library (drive) ID ===
  drives_resp = requests.get(
    f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives",
    headers=headers,
  )
  drives_resp.raise_for_status()

  drives = drives_resp.json()["value"]

  drive_id = next(
    (d["id"] for d in drives if d["name"] == doc_library),
    None,
  )

  if not drive_id:
    raise Exception(f"Library '{doc_library}' not found on site '{site_name}'")

  # === Upload actual file first ===
  upload_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{fy_year_value}/{folder_name}/{target_file_name}:/content"

  with open(file_path, "rb") as f:
    file_content = f.read()

  upload_resp = requests.put(upload_url, headers=headers, data=file_content)
  upload_resp.raise_for_status()

  file_web_url = upload_resp.json().get("webUrl")

  # === Prepare new entry ===
  new_entry = {
    "name": target_file_name,
    "url": file_web_url,
    "reference": reference_value,
    "section": section_list,
  }

  # === Concurrency-safe update of db.json ===
  db_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/{fy_year_value}/juggernaut/db.json:/content"

  MAX_RETRIES = 3

  for attempt in range(MAX_RETRIES):

    # ---- Download latest db.json ----
    db_resp = requests.get(db_url, headers=headers)

    if db_resp.status_code == 200:
      db_data = db_resp.json()
      etag = db_resp.headers.get("ETag")
    else:
      # First time creation scenario
      db_data = {
        "juggernaut": [],
        "client": [],
        "tools": [],
        "rbin": [],
      }
      etag = None

    # ---- Safe merge logic ----
    if folder_name not in db_data:
      db_data[folder_name] = []

    # Convert to dict by name to prevent duplicate loss
    existing_map = {
      entry.get("name"): entry
      for entry in db_data[folder_name]
    }

    action = "updated" if target_file_name in existing_map else "added"

    existing_map[target_file_name] = new_entry

    db_data[folder_name] = list(existing_map.values())

    # ---- Try upload with ETag protection ----
    updated_db_content = json.dumps(db_data, indent=4)

    upload_headers = {
      "Authorization": f"Bearer {access_token}",
      "Content-Type": "application/json",
    }

    if etag:
      upload_headers["If-Match"] = etag

    db_upload_resp = requests.put(
      db_url,
      headers=upload_headers,
      data=updated_db_content.encode("utf-8"),
    )

    # ---- Handle conflict ----
    if db_upload_resp.status_code == 412:
      print(f"Attempt {attempt+1}: Concurrency conflict detected. Re-merging latest version...")
      continue

    db_upload_resp.raise_for_status()

    print(f"Successfully {action} entry in db.json for '{target_file_name}'")
    print("File uploaded and db.json synchronized safely")
    break

  else:
    raise Exception("Failed to update db.json due to repeated concurrency conflicts")


if __name__ == "__main__":
  # === Example Usage ===
  file_path = "Independence_Response.json"
  folder_name = "juggernaut"
  section_list = ["Independence_Response"]

  jugg(file_path, "", folder_name, fy_year, section_list)


