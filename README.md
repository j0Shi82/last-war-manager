# Last War Manager

Last War Manager (LWM) is a Tampermonkey script for the [Last War Browsergame](https://last-war.de). It features both visual and functional upgrades to the user interface.

In the current early stages of development, the main goal is getting new features up. We'll deal with performance, security, and code streamlining / improvement later.

# Install

LWM uses the [Tampermonkey](https://tampermonkey.net/) extension that's available for all major browsers. Grab Tampermonkey and then install the script from one of the following sources:

- [OpenUserJS](https://openuserjs.org/scripts/j0shi82/Last_War_Manager)
- [GreaseFork](https://greasyfork.org/en/scripts/379871-last-war-manager)
- [GitHub](https://raw.githubusercontent.com/j0Shi82/last-war-manager/master/dist/last-war-manager.user.js)

The GitHub repository also includes a UserStyle file that only includes the visual changes. It is however included in the script and doesn't work independently anyway. You can try to install it on top in case you run into some trouble, but it will probably be discontinued soon. It stems from an earlier version.

# Feedback & Suggestions

A German feedback thread can be found on the [official message board](http://forum.last-war.de/viewtopic.php?f=4&t=967)) of the game. You can also post [issues on GitHub](https://github.com/j0Shi82/last-war-manager/issues). Please stick to English there.

# Screenshots

![Desktop Look](https://i.imgur.com/LNSIcSK.png "Desktop Look")

![Mobile Look](https://i.imgur.com/OIFOGbo.png "Mobile Look")

# Features

- Visual improvements for Desktop resolutions and a full mobile layout.
- Export and import settings from Google Drive
- Show fleet activity on all pages (optional)
  - Option to exclude drones from fleet activity
- Security confirmations for buildings, researches, and production pages (optional)
- All arrow keys that add or remove ships or defense bulk add them when you hold the mouse button
- Resources on the main page get highlighted when running trade would exceed their storage capacity and feature a hover tooltip with additional information
- Settings page that lets you control what the script should do
- **OVERVIEW**
  - Resources get added to the planets on the overview
  - Ability to switch planets by clicking the coord table headers
  - Fleet warning distance shows on the overview page
  - Highlight empty building and research slots => clicks directly lead to the building and research page
- **PRODUCTION**
  - Ability to hide ships (workaround for a known issue that prevents users to delete ship designs)
  - Filter to only show ships that meet certain criteria
  - Input fields on production pages listen to the enter key
- **UPGRADE & RECYCLE**
  - Buttons to bulk add ships to fleets
- **FLEETS**
  - The fleet movement page turned into a calendar page that lists all running tasks
    - The page groups similar entries to avoid too many rows
  - Callback button added to the fleet pages
  - Buttons to bulk add ships to fleets
  - Ability to store last used coords
  - While sending fleets, you can choose a return time and the script automatically adjusts speeds
  - Save raid priorities (premium only feature)
- **TRADE**
   - Ability to store last used coords
   - Two-click save to own planets (premium only feature)
     - Save trades are recognized by the script and can not be canceled from another planet
   - Trades that would exceed storage capacities when accepted/denied are highlighted
   - Option to bulk accept / deny trades
   - Statistics of currently active trades
- **BANK**
  - Buttons to fill bank and withdraw interest
- **RESOURCES**
  - New table that shows hourly and daily production for all planets
  - The page shows the time until capacities are reached for all resources
- **PLANETS**
  - Delete button is gone
  - Change button is gone. Instead, you can change planets by clicking on the coords
- **BUILD TREE**
  - Hide all achieved technologies
- **MESSAGES**
  - Ability to browse through messages with arrow keys
  - Direct links to combat and spy reports from the message root folder
- **GALAXY**
  - Sending spy and obs drones from the galaxy view
  - Ability to browse through the galaxy using the arrow keys
  - Add spy and obs links to all planets
  - The level of camouflage technology shows in the galaxy view if known
  - Planets with existing observation drones are marked in the galaxy view and instead of sending an obs drone open the report
  - Ability to select galaxys using a dropdown
- **ESPIONAGE**
  - Drone types without an amount do no longer show up in the spy listing (fixes a current bug)
- **OBSERVATIONS**
  - Ability to sort observations by coords
  - Re-send drones from the obs page
  - The level of camouflage technology shows on the obs page if known
  - Active obs for planets that fleets are currently attacking can be opened from the fleet menu. If no ob active, the script offers to send a spy drone instead.
  - Option added to open obs reports in new tabs instead of new windows

# Changelog

[changelog.md](CHANGELOG.md)
