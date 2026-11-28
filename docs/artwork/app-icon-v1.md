# KavirSavar launcher artwork

Original square illustration generated with the built-in image tool, using the airborne turquoise motorcycle as an identity reference. Full prompt: `app-icon-v1-prompt.json`. No lettering, border or extra vehicle.

The native master is `android/app/src/main/res/drawable-nodpi/kavirsavar_launcher_art_v1.png` (512×512 RGB PNG). Legacy launcher/round resources use the same art at 48, 72, 96, 144 and 192 pixels. These are resized encodings, without repainting the generated illustration.

Both base and v24 foreground drawables reference the new artwork at 72dp centered within adaptive-icon bounds; a teal background covers the overscan. The existing v26 adaptive square/round icon definitions reference those drawables. Android applies the launcher's shape mask.

The development APK has versionCode 2 / versionName 1.1 and retains its existing app ID and test signing identity. The build workflow verifies the offline web bundle byte-for-byte, verifies the new launcher raster is packaged, verifies the APK signature and publishes a direct APK release asset. The Google Studio `app/` source remains unchanged.
