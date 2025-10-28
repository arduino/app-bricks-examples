/*
 * SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
 *
 * SPDX-License-Identifier: MPL-2.0
 */

const uint32_t good[] = {
    0x0f808209,
    0x484042fa,
    0x14509c82,
    0x08000000,
};

const uint32_t moderate[] = {
    0x0f808209,
    0x4840428a,
    0x13904101,
    0xf0000000,
};

const uint32_t unhealthy_for_sensitive_groups[] = {
    0x0f808209,
    0x484042fa,
    0x10104101,
    0xf0000000,
};

const uint32_t unhealthy[] = {
    0x0f808209,
    0x48404272,
    0x14508083,
    0xf8000000,
};

const uint32_t very_unhealthy[] = {
    0x0f808209,
    0x485b4202,
    0x13904101,
    0xf0000000,
};

const uint32_t hazardous[] = {
    0x0f80820b,
    0x68514222,
    0x08202a01,
    0x50000000,
};

const uint32_t unknown[] = {
    0x00003002,
    0x40020020,
    0x02000000,
    0x80000000,
};
