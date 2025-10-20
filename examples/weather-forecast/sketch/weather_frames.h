/*
 * SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
 *
 * SPDX-License-Identifier: MPL-2.0
 */

const uint32_t Sunny[] = {
    0xa0148120,
    0x9c1c801,
    0x409402c0,
    0x2
};
const uint32_t Sunny2[] = {
    0x804a0048,
    0x39004e05,
    0x2900d0,
    0x9
};
const uint32_t* SunnyFrames[] = { Sunny, Sunny2 };

const uint32_t Cloudy[] = {
    0x701c0000,
    0x20211104,
    0x7f0404,
    0x0
};
const uint32_t Cloudy2[] = {
    0xe0380000,
    0x40422208,
    0xfe0808,
    0x0
};
const uint32_t Cloudy3[] = {
    0xc0700000,
    0x80844411,
    0x1fc1010,
    0x0
};
const uint32_t Cloudy4[] = {
    0xe0380000,
    0x40422208,
    0xfe0808,
    0x0
};
const uint32_t* CloudyFrames[] = { Cloudy, Cloudy2, Cloudy3, Cloudy4 };

const uint32_t Rainy[]  = {
    0x104301e0,
    0x3f820210,
    0x8a0510,
    0x5
};
const uint32_t Rainy2[] = {
    0x104301e0,
    0x3f820210,
    0x40a20140,
    0x11
};
const uint32_t Rainy3[] = {
    0x104301e0,
    0x3f820210,
    0x40280450,
    0x14
};
const uint32_t* RainyFrames[] = { Rainy, Rainy2, Rainy3 };

const uint32_t Snowy[]  = {
    0x104301e0,
    0x3f820210,
    0x220040,
    0x11
};
const uint32_t Snowy2[] = {
    0x104301e0,
    0x3f820210,
    0x40080400,
    0x4
};
const uint32_t Snowy3[] = {
    0x104301e0,
    0x3f820210,
    0x800110,
    0x1
};
const uint32_t* SnowyFrames[] = { Snowy, Snowy2, Snowy3 };

const uint32_t Foggy[] = {
    0xdf8000,
    0x3f600,
    0xef8,
    0x0
};
const uint32_t Foggy2[] = {
    0xf78000,
    0x3ee00,
    0xdf8,
    0x0
};

const uint32_t* FoggyFrames[] = { Foggy, Foggy2 };
