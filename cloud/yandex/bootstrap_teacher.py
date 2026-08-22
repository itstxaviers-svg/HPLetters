import getpass
import json
import urllib.error
import urllib.request


api_url = input("API Gateway URL (без / в конце): ").strip().rstrip("/")
bootstrap_secret = getpass.getpass("BOOTSTRAP_SECRET из настроек функции: ")
pin = getpass.getpass("PIN учителя (например, 19071970): ")
display_name = input("Имя учителя: ").strip() or "Teacher"
group_name = input("Название класса (например, 2A): ").strip() or "Learn Letters"
join_code = input("Код класса латиницей (например, LETTERS-2A): ").strip().upper()

body = json.dumps({
    "pin": pin,
    "displayName": display_name,
    "groupName": group_name,
    "joinCode": join_code,
}).encode("utf-8")
request = urllib.request.Request(
    f"{api_url}/setup/teacher",
    data=body,
    method="POST",
    headers={"Content-Type": "application/json", "X-Bootstrap-Secret": bootstrap_secret},
)

try:
    with urllib.request.urlopen(request) as response:
        print("Готово:", response.read().decode("utf-8"))
except urllib.error.HTTPError as error:
    print("Ошибка:", error.code, error.read().decode("utf-8"))
