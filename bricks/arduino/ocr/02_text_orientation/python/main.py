# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.ocr import OCR
from arduino.app_utils import App

ocr = OCR()


def extract_text():
    result = ocr.extract_text("assets/text.png", rotation=[0, 90])
    print(result.text, flush=True)
    raise StopIteration


App.run(user_loop=extract_text)
