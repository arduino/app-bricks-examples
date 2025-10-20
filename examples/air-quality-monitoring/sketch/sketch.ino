// SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>

#include "air_quality_frames.h"

// TODO: those will go into an header file.
extern "C" void matrixWrite(const uint32_t* buf);
extern "C" void matrixBegin();

void setup() {
    matrixBegin();

    Bridge.begin();
}

void loop() {
    String airQuality;
    bool ok = Bridge.call("get_air_quality").result(airQuality);
    if (ok) {
        if (airQuality == "Good") {
            matrixWrite(good);
        } else if (airQuality == "Moderate") {
            matrixWrite(moderate);
        } else if (airQuality == "Unhealthy for Sensitive Groups") {
            matrixWrite(unhealthy_for_sensitive_groups);
        } else if (airQuality == "Unhealthy") {
            matrixWrite(unhealthy);
        } else if (airQuality == "Very Unhealthy") {
            matrixWrite(very_unhealthy);
        } else if (airQuality == "Hazardous") {
            matrixWrite(hazardous);
        } else {
            matrixWrite(unknown);
        }
    }
    delay(1000);
}
