/*
 * SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
 *
 * SPDX-License-Identifier: MPL-2.0
 */

const uint32_t good[] = {
    0x904101f0,
    0x5f420212,
    0x41390a28,
    0x10,
};

const uint32_t moderate[] = {
    0x904101f0,
    0x51420212,
    0x808209c8,
    0xf,
};

const uint32_t unhealthy_for_sensitive_groups[] = {
    0x904101f0,
    0x5f420212,
    0x80820808,
    0xf,
};

const uint32_t unhealthy[] = {
    0x904101f0,
    0x4e420212,
    0xc1010a28,
    0x1f,
};

const uint32_t very_unhealthy[] = {
    0x904101f0,
    0x4042da12,
    0x808209c8,
    0xf,
};

const uint32_t hazardous[] = {
    0xd04101f0,
    0x44428a16,
    0x80540410,
    0xa,
};

const uint32_t unknown[] = {
    0x400c0000,
    0x4004002,
    0x40,
    0x1,
};
