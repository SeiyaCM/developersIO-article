from enum import StrEnum
import os
import urllib.parse
import datetime

from PIL import Image
import boto3

# クライアント
s3_clinet = boto3.client('s3')
dynamodb_client = boto3.client('dynamodb')

# 現在時刻をファイル名にするため処理
t_delta = datetime.timedelta(hours=9)
JST = datetime.timezone(t_delta, 'JST')

# 設備状態を定義
class StateType(StrEnum):
    GOOD = "Good"
    STOP = "Stop"
    ABNORMALITY = "Abnomality"


def handler(event, context):
    now = datetime.datetime.now(JST)
    s3_record = event["Records"][0]["s3"]
    print(f"s3_record: {s3_record}")
    
    bucket_name: str = s3_record["bucket"]["name"]
    key: str = urllib.parse.unquote_plus(s3_record["object"]["key"], encoding="utf-8")
    print(f"bucket name: f{bucket_name}")
    print(f"key: {key}")

    source_file = u'/tmp/' + os.path.basename(key)
    file_name = now.strftime('%Y%m%d%H%M%S')

    try:
        s3_clinet.download_file(Bucket=bucket_name, Key=key, Filename=source_file)
        image = Image.open(source_file, 'r')
        color_value_dict = get_last_hist_value(image=image)
        state:StateType = pred_state(color_value_dict)
        print(f"state: {state}")
        dynamodb_client.put_item(
            TableName=os.environ["TABLE_NAME"],
            Item={
                "equipment-number": {
                    "S": file_name
                },
                "file-name": {
                    "S": key.replace(".jpg", "")
                },
                "state": {
                    "S": state
                }
            }
        )

    except Exception as e:
        print(e)
        raise e

    return {}


def get_last_hist_value(image) -> dict:
    hist_dict = dict()
    hist = image.histogram()
    hist_dict["R"] = hist[:256]
    hist_dict["G"] = hist[256:512]
    hist_dict["B"] = hist[512:]

    hist_last_value_dict = {"R": hist_dict["R"][-1],
                            "G": hist_dict["G"][-1],
                            "B": hist_dict["B"][-1]}
    
    return hist_last_value_dict

def pred_state(color_value_dict: dict):
    # 大きい順に並び替え
    sorted_value_dict = sorted(color_value_dict.items(), key=lambda x:x[1], reverse=True)

    if sorted_value_dict[0][0] == "G":
        return StateType.GOOD
    
    # GreenとRedの成分を比較
    red_value = sorted_value_dict[0][1]
    green_value = sorted_value_dict[1][1]
    # 差が大きければgood, それ以外であればstop
    diff_value = red_value - green_value
    if diff_value > 5000:
        return StateType.ABNORMALITY
    else:
        return StateType.STOP