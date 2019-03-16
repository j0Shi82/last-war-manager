# Last War Manager

Last War Manager (LWM) is a Tampermonkey script for the [Last War Browsergame](https://last-war.de). It features both visual and functional upgrades to the user interface.

In the current early stages of development, the main goal is getting new features up. We'll deal with performance, security, and code streamlining / improvement later.

# Install

LWM uses the [Tampermonkey](https://tampermonkey.net/) extension that's available for all major browsers. Grab Tampermonkey and then install the script from one of the following sources:

- [OpenUserJS](https://openuserjs.org/scripts/j0shi82/Last_War_Manager)
- [GreaseFork](https://greasyfork.org/en/scripts/379871-last-war-manager)
- [GitHub](https://raw.githubusercontent.com/j0Shi82/last-war-manager/master/last-war-manager.user.js)

The GitHub repository also includes a UserStyle file that only includes the visual changes. It is however included in the script and doesn't work independently anyway. You can try to install it on top in case you run into some trouble, but it will probably be discontinued soon. It stems from an earlier version.

# Feedback & Suggestions

A German feedback thread can be found on the [official message board](http://forum.last-war.de/viewtopic.php?f=4&t=967)) of the game. You can also post [issues on GitHub](https://github.com/j0Shi82/last-war-manager/issues). Please stick to English there.

# Screenshots

![Desktop Look](https://i.imgur.com/LNSIcSK.png "Desktop Look")

![Mobile Look](https://i.imgur.com/OIFOGbo.png "Mobile Look")

# Features

- Visual improvements for Desktop resolutions and a full mobile layout.
- Export and import settings from Google Drive
- Show planet fleet activity on all pages (optional)
- Security confirmations for buildings, researches, and production pages (optional)
- Settings page that lets you control what the script should do
- **OVERVIEW**
  - Resources get added to the planets on the overview
  - Ability to switch planets by clicking the coord table headers
- **PRODUCTION**
  - Ability to hide ships (workaround for a known issue that prevents users to delete ship designs)
  - Filter to only show ships that meet certain criteria
- **UPGRADE & RECYCLE**
  - Buttons to bulk add ships to fleets
- **FLEETS**
  - Callback button added to the fleet pages
  - Buttons to bulk add ships to fleets
  - Ability to store last used coords
- **TRADE**
   - Ability to store last used coords
   - Two-click save to own planets
- **RESOURCES**
  - New table that shows hourly and daily production for all planets
- **PLANETS**
  - Delete button is gone
  - Change button is gone. Instead, you can change planets by clicking on the coords
- **BUILD TREE**
  - Hide all achieved technologies
- **MESSAGES**
  - Ability to browse through messages with arrow keys
  - Direkt links to combat and spy reports from the message root folder
- **GALAXY**
  - Sending spy drones from the galaxy view
  - Ability to browse through the galaxy using the arrow keys
- **OBSERVATIONS**
  - Ability to sort obervations by coords
