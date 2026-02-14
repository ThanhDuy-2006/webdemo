import json
try:
    with open('movie_detail.json', 'r', encoding='utf-16') as f:
        data = json.load(f)
    print("Top level keys:", list(data.keys()))
    if 'data' in data:
        print("Data keys:", list(data['data'].keys()))
        if 'item' in data['data']:
            print("Item keys:", list(data['data']['item'].keys()))
except Exception as e:
    print("Error:", e)
    # Try utf-8
    try:
        with open('movie_detail.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        print("Top level keys (utf8):", list(data.keys()))
        if 'data' in data:
            print("Data keys:", list(data['data'].keys()))
    except Exception as e2:
        print("Error utf8:", e2)
