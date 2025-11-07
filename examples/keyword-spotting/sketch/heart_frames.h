/*
 * SPDX-FileCopyrightText: Copyright (C) 2025 ARDUINO SA <http://www.arduino.cc>
 *
 * SPDX-License-Identifier: MPL-2.0
 */

const uint32_t HeartStatic[4] = {
    0x00006c04,
    0x90208088,
    0x02800800,
    0x00000000,
};

const uint32_t HeartAnim[][5] = {
    {0x1dc11108, 0x08404104, 0x04401400, 0x40000000, 55},
    {0x3fe31198, 0x0cc06306, 0x0c603600, 0xe0000000, 55},
    {0x3fe31198, 0x0cc06306, 0x0c603600, 0xe0000000, 55},
    {0x7ff711f8, 0x0fc07707, 0x1c707701, 0xf0000000, 55},
    {0xffff11f8, 0x0fc07f07, 0xbc78f783, 0xf8000000, 55},
    {0xffff11f8, 0x0fc07f07, 0xfc7ff7ef, 0xfe000000, 55},
    {0xffff11f8, 0x0fc07f07, 0xfc7ff7ff, 0xff000000, 55},
    {0xffff11f8, 0x0fc07f07, 0xfc7ff7ff, 0xff000000, 55},
};
