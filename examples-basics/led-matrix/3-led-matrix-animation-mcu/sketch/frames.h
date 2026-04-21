// Animation frames for the LED matrix.
// Each frame is 5 uint32_t values: [pixel0, pixel1, pixel2, pixel3, duration_ms].
// The first 4 values encode the 8×13 binary pixel data packed into 128 bits where each
// pixel represents 2 lines of pixels on the matrix, and each pixel is represented by 3 bits for brightness (0-7).
// The 5th value is the display duration in milliseconds.
// This is the native format used by Arduino_LED_Matrix::loadSequence / playSequence.

const uint32_t animation[][5] = {
    {0xc0198303, 0x600e0070, 0x06c0c198, 0x03000000, 500},  // X shape
    {0x02002802, 0x20208104, 0x04401400, 0x40000000, 500},  // Diamond shape
    {0xfffc0060, 0x03001800, 0xc006003f, 0xff000000, 500},  // Border rectangle
};
