import getpass
import json
import os
import ssl
import time
import urllib.error
import urllib.request


API_URL = "https://d5d98aa4957o0vm5qrpg.g4vq2kuy.apigw.yandexcloud.net"


def request_json(path, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        f"{API_URL}{path}",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers=headers,
    )
    ca_file = "/etc/ssl/cert.pem"
    context = ssl.create_default_context(cafile=ca_file) if os.path.exists(ca_file) else ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.maximum_version = ssl.TLSVersion.TLSv1_2
    last_error = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, context=context, timeout=90) as response:
                return json.loads(response.read().decode("utf-8"))
        except (TimeoutError, urllib.error.URLError) as error:
            last_error = error
            if attempt < 3:
                print(f"Соединение с Yandex медленное. Повтор {attempt + 1} из 3…")
                time.sleep(3)
    raise last_error


current_pin = getpass.getpass("Текущий PIN учителя: ")
new_pin = getpass.getpass("Новый PIN учителя: ")
new_pin_confirmation = getpass.getpass("Повторите новый PIN: ")

if new_pin != new_pin_confirmation:
    raise SystemExit("Новые PIN не совпадают. Изменения не внесены.")
if not new_pin.isdigit() or not 6 <= len(new_pin) <= 12:
    raise SystemExit("PIN должен содержать от 6 до 12 цифр.")

try:
    login = request_json("/teacher/login", {"pin": current_pin})
    token = login["session"]["token"]
    result = request_json("/teacher/pin", {"newPin": new_pin}, token)
    if result.get("ok"):
        print("Готово: PIN учителя изменён.")
    else:
        print("Не удалось изменить PIN.")
except urllib.error.HTTPError as error:
    message = error.read().decode("utf-8")
    print(f"Ошибка {error.code}: {message}")
except urllib.error.URLError as error:
    print(f"Ошибка соединения: {error.reason}")
