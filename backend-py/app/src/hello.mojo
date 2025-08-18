from python import Python
from collections import Dict
import sys

fn main() raises:
    # Python fastapi
    var fastapi = Python.import_module("fastapi")
    var uvicorn = Python.import_module("uvicorn")

    var app = fastapi.FastAPI()
    var router = fastapi.APIRouter()

    # tricky part
    var py = Python()
    var py_code = """lambda: 'Hello Mojo🔥!'"""
    var py_obj = py.evaluate(py_code)
    print(py_obj)

    router.add_api_route("/", py_obj)
    app.include_router(router)

    print("Start FastAPI WEB Server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    print("Done")
