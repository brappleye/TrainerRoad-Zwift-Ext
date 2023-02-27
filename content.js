
var url = "https://www.trainerroad.com/api/workoutdetails/" + document.location.href.split('/').pop().split('-')[0]

setTimeout(() => {
    const exportBtn = document.createElement("div");
    exportBtn.className = "export-button";
    const helpIcon = document.createElement("span");
    helpIcon.className = "help-icon";

    exportBtn.innerHTML = "<span>Export</span>";
    exportBtn.appendChild(helpIcon);
    exportBtn.addEventListener('click', exportWorkout);
    helpIcon.addEventListener('mouseenter', showHelp);
    helpIcon.addEventListener('mouseleave', hideHelp);
    
    const infoBox = document.createElement("div");
    infoBox.id = "info-box";
    infoBox.className = "info-box";
    infoBox.innerHTML = "<span>Creates a .zwo file of this interval workout for import into Zwift. Copy the exported file from your downloads folder into your Zwift Workouts folder.<br/><br/><span class='subtext'>You should see a folder named <b>Zwift</b> with a folder <b>Workouts</b> in it, and a folder named <b>{Your Zwift User Id}</b> in your user <b>Documents</b> folder. Place your .zwo file in this folder. Make sure Zwift isn't running. You will see your workout in Zwift under Custom Workouts once added.</span></span>";
    exportBtn.appendChild(infoBox);

    //const favButton = document.getElementsByClassName('IconButton__Tag-sc-1o4qyde-0');
    const menuButton = document.getElementsByTagName('button');

    menuButton[5].parentNode.parentNode.parentNode.insertBefore(exportBtn, menuButton[5].parentNode.parentNode);
    menuButton[5].className += " schedule-button";

}, 500);

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function showHelp(){
    const info = document.getElementById("info-box");
    info.style.display = "block";
    
}
function hideHelp(){
    const info = document.getElementById("info-box");
    info.style.display = "none";
}

function exportWorkout(){
    fetch(url, {credentials: "include"}).then(res => res.json())
    .then(function (json) {
            
        let structure = [],
            end = 0;

            testInterval = false;
        const intervalData = json.Workout.intervalData;

        for (var i = 1; i < intervalData.length; i++) {
            if (intervalData[i].TestInterval) {
                testInterval = intervalData[i];
                break;
            }
        }

        for (var i = 1; i < intervalData.length; i++) {
            if (testInterval && testInterval.Name !== intervalData[i].Name) {
                if (intervalData[i].Start >= testInterval.Start && 
                    intervalData[i].End <= testInterval.End) {
                    continue;
                }
            }

            let ic = 'warmUp';
            if (i == 1) { ic = 'warmUp'; }
            else if (i === intervalData.length) { ic = 'coolDown' }
            else if (intervalData[i].StartTargetPowerPercent > 60) { ic = 'active'; } 	
            else { ic = 'rest'; }

        //	console.log(intervalData[i]);

            if (intervalData[i].Name === 'Fake' && i === 1) {
                intervalData[i].Name = 'Warm up';
            } else if (intervalData[i].Name === 'Fake') {
                intervalData[i].Name = 'Recovery';
            }

            end = intervalData[i].End;

            structure.push ({"name":intervalData[i].Name, "length": intervalData[i].End - intervalData[i].Start, "target": intervalData[i].StartTargetPowerPercent, "begin":intervalData[i].Start, "end":intervalData[i].End }); 

        }
        const duration = parseInt(json.Workout.Details.Duration)/60;
        let description = json.Workout.Details.WorkoutDescription + "\n\n" +json.Workout.Details.GoalDescription;

        description += "\n\nhttps://www.trainerroad.com/cycling/workouts/" + json.Workout.Details.Id;


        const workoutData = {
            name: json.Workout.Details.WorkoutName,
            description: description,
            workout: structure
        }

        let out = `<workout_file>
        <author>TrainerRoad</author>
        <name>` + workoutData.name + `</name>
        <description><![CDATA[` + workoutData.description + `]]></description>
        <sportType>bike</sportType>
        <tags/>
        <workout>`;

        for (var i in structure) {
            if (structure[i].name === 'Warm up') {
                out += '<Warmup Duration="' + structure[i].length + '" PowerHigh="' + (structure[i].target/100) + '" PowerLow="0.4"></Warmup>' + "\n";
            } else {
                out += '<SteadyState Duration="' + structure[i].length + '" Power="' + (structure[i].target/100) + '"></SteadyState>' + "\n";
            }
            powerLow = structure[i].target;
        }
            out += `</workout>
        </workout_file>`
        download(workoutData.name + '.zwo', out)
    });
}