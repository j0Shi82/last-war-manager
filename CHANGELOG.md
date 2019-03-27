#Changelog

## v0.7.0

- The production page no longer has the shipdock in its submenu
- The fleet page now turned to a calendar page that lists all running tasks
  - Per default, the calendar only shows fleet activity, but it can list buildings, research, production, etc. as well
- The fleet page was scratched from all submenus
- Some improvements have been made to the script startup routine to speed up things and avoid errors

- **FLEETS**
  - The icon to recall a fleet now only shows up in case the fleet is on its way to the target
  - While sending fleets, you can choose a return time and the script automatically adjusts speeds

## v0.6.0

- All arrow keys that add or remove ships or defense bulk add them when you hold the mouse button
- Resources on the main page get highlighed when running trade would exceed their storage capacity

- **OBSERVATIONS**
  - Ability to sort obervations by coords

- **MESSAGES**
  - Direkt links to combat and spy reports from the message root folder

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