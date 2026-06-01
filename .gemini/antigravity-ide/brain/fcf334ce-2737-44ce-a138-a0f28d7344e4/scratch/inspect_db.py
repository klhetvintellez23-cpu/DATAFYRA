import requests

headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Ymtsa3N5Z3NzcnZieW92anN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODAxMDcsImV4cCI6MjA5MjM1NjEwN30.2HaFP5_RbGB1kiidpYJ5F1yKyRGp8RqOY_tGq0QY4vc",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Ymtsa3N5Z3NzcnZieW92anN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODAxMDcsImV4cCI6MjA5MjM1NjEwN30.2HaFP5_RbGB1kiidpYJ5F1yKyRGp8RqOY_tGq0QY4vc"
}

url = "https://xwbklksygssrvbyovjsv.supabase.co/rest/v1/envios?limit=1"
r = requests.get(url, headers=headers)
print("Envios Status:", r.status_code)
if r.status_code == 200:
    data = r.json()
    if data:
        print("Envios columns:", list(data[0].keys()))
    else:
        print("Envios is empty.")
else:
    print("Error:", r.text)
