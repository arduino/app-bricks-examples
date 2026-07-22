# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_bricks.streamlit_ui import st
from arduino.app_utils import App
from arduino.app_bricks.sound_generator import SoundGenerator, SoundEffect


@st.cache_resource
def init_bricks():
    """Initialize bricks once. Streamlit re-runs the script on every interaction,
    so we use @st.cache_resource to avoid re-creating hardware resources."""
    return SoundGenerator(sound_effects=[SoundEffect.adsr()])


player = init_bricks()

st.title("Streamlit + Sound Generator Example")
st.write("Press the button below to play a short melody.")

note = st.selectbox("Choose a note", ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"])
duration = st.slider("Duration (seconds)", min_value=0.5, max_value=3.0, value=1.0, step=0.5)

if st.button("Play sound"):
    player.play(note, duration)
    st.success(f"Played {note} for {duration}s")

App.run()
