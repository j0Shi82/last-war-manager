# Changelog

## v0.8.0

- The Google Drive saves are loaded once per login, not once per planet change.
- **TRADE**
  - Save trades are now recognized by the script and can no longer be canceled from another planet.
  - Fixed multiple bugs that sometimes incorrectly found trades to exceed storage capacities.
  - Added an option to bulk accept / deny trades.
- **ESPIONAGE**
  - Drone types without an amount do no longer show up in the spy listing.
- **FLEETS**
  - Added the ability to auto save raid priorities.
  - The fleet addon now shows fleet activity for all recently visited planets, not just the current one.
  - Added an option to exclude drones from fleet activity.
  - Fleets on their way back now have an info icon that leads to the fleet info.
  - Fleets received a visual upgrade and can be filtered by coords, type, and status.
  - In case the fleet addon is deactivated, fleets show up again on the old fleet / now calendar page.
  - The original speed of fleets was added to the fleet table.
- **OVERVIEW**
  - Fleet warning distance shows on the overview page.
- **CALENDAR**
  - The calendar now groups similar entries to avoid too many rows.
- **OBSERVATIONS**
  - You can now re-send drones from the obs page.
  - Planets with existing observation drones are now marked in the galaxy view and instead of sending an obs drone open the existing obs report.
  - The level of camouflage technology now shows on the obs page for known planets.
  - Active obs for planets that fleets are currently attacking can now be opened from the fleet menu. If no ob active, the script offers to send a spy drone.
  - Option added to open obs reports in new tabs instead of new windows.
- **GALAXY**
  - The level of camouflage technology now shows in the galaxy view for known planets.
- **PRODUCTION**
  - Input fields on production pages listen to the enter key.
- **BANK**
  - Added buttons to the bank page to fill bank and withdraw interest.

## v0.7.0

- The production page no longer has the ship dock in its submenu
- The fleet page now turned to a calendar page that lists all running tasks
  - Per default, the calendar only shows fleet activity, but it can list buildings, research, production, etc. as well
- The fleet page was scratched from all submenus
- Some improvements have been made to the script startup routine to speed up things and avoid errors
- **FLEETS**
  - The icon to recall a fleet now only shows up in case the fleet is on its way to the target
  - While sending fleets, you can choose a return time and the script automatically adjusts speeds
- **OVERVIEW**
  - Show energy and building slots on overview page for all planets

## v0.6.0

- All arrow keys that add or remove ships or defense bulk add them when you hold the mouse button
- Resources on the main page get highlighted when running trade would exceed their storage capacity

- **OBSERVATIONS**
  - Ability to sort observations by coords
- **MESSAGES**
  - Direct links to combat and spy reports from the message root folder
- **GALAXY**
  - Add spy links to all planets
  - Sending obs drones from the galaxy view
- **RESOURCES**
  - Page now shows the time until capacities are reached for all resources
- **TRADE**
  - Trades that would exceed storage capacities when accepted/denied are highlighted

## v0.5.2

- Fixed a bug that caused fleet movements to disappear under certain circumstances
- Fixed a bug that caused timers to not work for drone fleets

## v0.5.1

- Resolved #4: [Research confirm doesn't work](https://github.com/j0Shi82/last-war-manager/issues/4)
- Manager shouldn't get stuck on loading screens on first load.
- Fixed the alliance page so all submenu buttons are now properly displayed. Page doesn't look great, but at least its functional now.
- Deactivated scrolling on message pages to not accidentally trigger a browse whlle drafting a reply.
- The main background picture now scales on big resolutions.
- Reduced the requests per pageload and also tweaked some number so that pages should now appear faster.
- Fleets no loner trigger a page reload to avoid unwanted reloads.
- The script now applies to both www.last-war.de as well as last-war.de