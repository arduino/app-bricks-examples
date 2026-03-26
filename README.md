# app-bricks-examples

Example applications based on Arduino Bricks for the Arduino UNO Q.

## Update licenses

### Requirements
- Python 3.13+
- Ruby 3.1+ + RubyGems
- Taskfile (https://taskfile.dev/docs/installation).

#### Ruby installation options
- Linux (apt): `sudo apt-get install ruby-full`
- Linux (linuxbrew): `brew install ruby`
- Linux (`rbenv`): install `rbenv`
- macOS: `brew install ruby`
- Windows: use WSL (`wsl --install`) and then follow one of the Linux options above

To update the licenses:
- Run `task license`.
- The task first checks for `licensed` 5.0.6.
- If `licensed` 5.0.6 is not available, the task tries to install it automatically with `gem`.
- If the installation fails, make sure `ruby` and `gem` are installed and available in `PATH`, then retry.
