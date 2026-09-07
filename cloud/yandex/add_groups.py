import getpass
import json
import os
import ssl
import urllib.error
import urllib.request


def request_json(url, body, headers=None):
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    context = ssl.create_default_context(cafile="/etc/ssl/cert.pem") if os.path.exists("/etc/ssl/cert.pem") else ssl.create_default_context()
    with urllib.request.urlopen(request, context=context, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


api_url = input("API Gateway URL (без / в конце): ").strip().rstrip("/")
pin = getpass.getpass("PIN учителя: ")

try:
    session = request_json(f"{api_url}/teacher/login", {"pin": pin})["session"]
except urllib.error.HTTPError as error:
    print("Ошибка входа:", error.code, error.read().decode("utf-8"))
    raise SystemExit(1)
except urllib.error.URLError as error:
    print("Ошибка соединения:", error.reason)
    raise SystemExit(1)

while True:
    group_name = input("Название следующего класса (пусто — закончить): ").strip()
    if not group_name:
        break
    join_code = input("Код класса латиницей/цифрами: ").strip().upper()
    try:
        result = request_json(
            f"{api_url}/teacher/groups",
            {"groupName": group_name, "joinCode": join_code},
            {"Authorization": f"Bearer {session['token']}"},
        )
        print("Готово:", json.dumps(result, ensure_ascii=False))
    except urllib.error.HTTPError as error:
        print("Ошибка:", error.code, error.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError) as error:
        print("Ошибка соединения:", getattr(error, "reason", error))
