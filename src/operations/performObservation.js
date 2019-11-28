import { siteWindow, lwmJQ } from 'config/globals';
import config from 'config/lwmConfig';
import { getFlottenbewegungenInfo, getSpionageInfo } from 'utils/requests';

const { alert, confirm } = siteWindow;

const performObservation = (coords) => {
  const data = config.gameData.spionageInfos;
  if (data.observations_drons.length === 0) {
    alert('Unable to find drones to use');
    return;
  }

  // grab the first eligable drone with IOB and roll with it
  const drone = lwmJQ.grep(data.observations_drons, (el) => el.engine_type === 'IOB' && parseInt(el.number, 10) > 0);
  if (drone.length === 0) {
    alert('Unable to find drones to use');
    return;
  }

  const droneID = drone[0].id;

  const obj = {
    galaxy_check: siteWindow.my_galaxy,
    system_check: siteWindow.my_system,
    planet_check: siteWindow.my_planet,
    type: '1',
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
    success(reponseData) {
      if (reponseData === '-1' || reponseData === '500' || reponseData === '-2' || reponseData === '-4' || reponseData === '-5' || reponseData === '-6'
                        || reponseData === '-10' || reponseData === '-11' || reponseData === '-12'
                        || reponseData === '-20' || reponseData === '-21' || reponseData === '-22' || reponseData === '-23' || reponseData === '24' || reponseData === '-30') {
        alert('some error occured :/');
      } else if (!reponseData) {
        siteWindow.logoutRequest();
      } else if (reponseData.error) {
        alert(reponseData.error);
      } else if (reponseData.dron_id) {
        let message = '';
        if (parseInt(reponseData.real_number, 10) === 1) {
          message = `Frurozin benötigt: ${reponseData.Frurozin_d}, Ankunftszeit: ${reponseData.string}. Möchtest du abschicken?`;
        } else if (reponseData.real_number > 1) {
          message = `Frurozin benötigt: ${reponseData.Frurozin_d}. Möchtest du abschicken?`;
        }

        const r = confirm(message);
        if (r === true) {
          siteWindow.jQuery.post('/ajax_request/put_observationen_drons.php', {
            Units: reponseData.Units,
            EngineType_Drone: reponseData.EngineType_Drone,
            Speed_Drone: reponseData.Speed_Drone,
            Name_Dron: reponseData.Name_Dron,
            galaxy1: reponseData.spionage_galaxy,
            system1: reponseData.spionage_system_from,
            planet1: reponseData.spionage_planet_from,
            planet2: reponseData.spionage_planet_to,
            real_number: reponseData.real_number,
            id_drones: reponseData.dron_id,
            Frurozin_d: reponseData.Frurozin_d,
            galaxy_check: siteWindow.my_galaxy,
            system_check: siteWindow.my_system,
            planet_check: siteWindow.my_planet,
          }, (responseData) => {
            if (responseData === '1') {
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

export default performObservation;
