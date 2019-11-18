import { siteWindow, lwmJQ } from 'config/globals';
import config from 'config/lwmConfig';
import { getFlottenbewegungenInfo, getSpionageInfo } from 'utils/requests';

const { alert, confirm } = siteWindow;

const performSpionage = (coords) => {
  const data = config.gameData.spionageInfos;
  if (data.planetenscanner_drons.length === 0) {
    alert('Unable to find drones to use');
    return;
  }

  // grab the first eligable drone with IOB and roll with it
  const drone = lwmJQ.grep(data.planetenscanner_drons, (el) => el.engine_type === 'IOB' && parseInt(el.number, 10) > 0);
  if (drone.length === 0) {
    alert('Unable to find drones to use');
    return;
  }

  const droneID = drone[0].id;

  const obj = {
    galaxy_check: siteWindow.my_galaxy,
    system_check: siteWindow.my_system,
    planet_check: siteWindow.my_planet,
    type: '2',
    dron_id: droneID,
    dron_quantity: 1,
    galaxy_spionage: coords[0],
    system_from_spionage: coords[1],
    planet_from_spionage: coords[2],
    planet_to_spionage: -1,
  };

  // we're using a simplified version of sendSpionageAction in spionage.js
  siteWindow.jQuery.ajax({
    type: 'POST',
    dataType: 'json',
    url: '/ajax_request/send_spionage_action.php',
    data: obj,
    timeout: config.promises.interval.ajaxTimeout,
    error(jqXHR, textStatus, errorThrown) {
      alert(`${textStatus}: ${errorThrown}`);
    },
    success(responseData) {
      if (responseData === '-1' || responseData === '500' || responseData === '-2' || responseData === '-4' || responseData === '-5' || responseData === '-6'
                        || responseData === '-10' || responseData === '-11' || responseData === '-12'
                        || responseData === '-20' || responseData === '-21' || responseData === '-22' || responseData === '-23' || responseData === '24' || responseData === '-30') {
        alert('some error occured :/');
      } else if (!responseData) {
        siteWindow.logoutRequest();
      } else if (responseData.error) {
        alert(data.error);
      } else if (responseData.dron_id) {
        let message = '';
        if (parseInt(responseData.real_number, 10) === 1) {
          message = `Frurozin benötigt: ${responseData.Frurozin_d}, Ankunftszeit: ${responseData.string}. Möchtest du abschicken?`;
        } else if (responseData.real_number > 1) {
          message = `Frurozin benötigt: ${responseData.Frurozin_d}. Möchtest du abschicken?`;
        }

        const r = confirm(message);
        if (r === true) {
          siteWindow.jQuery.post('/ajax_request/put_planetenscanner_drons.php', {
            Units: data.Units,
            EngineType_Drone: data.EngineType_Drone,
            Speed_Drone: data.Speed_Drone,
            Name_Dron: data.Name_Dron,
            galaxy1: data.spionage_galaxy,
            system1: data.spionage_system_from,
            planet1: data.spionage_planet_from,
            planet2: data.spionage_planet_to,
            real_number: data.real_number,
            id_drones: data.dron_id,
            Frurozin_d: data.Frurozin_d,
            status_planete: data.status_planete,
            galaxy_check: siteWindow.my_galaxy,
            system_check: siteWindow.my_system,
            planet_check: siteWindow.my_planet,
          }, (responseData2) => {
            if (responseData2 === '1') {
              // refresh fleets and spy infos
              getFlottenbewegungenInfo();
              getSpionageInfo();
            } else {
              alert('some error occured :/');
            }
          });
        }
      } else {
        alert('some error occured :/');
      }
    },
  });
};

export default performSpionage;
