// simple script to add export buttons in the TR site that will output .zwo files for consumption in Zwift.
// TR workout parsing and .zwo creation based on script provided by pchalacis 
//(found at https://raw.githubusercontent.com/pchalacis/trainerroad-to-trainingpeaks/master/createZwiftFile.js)
let intervalTimer;

//handler to run on the specified interval to determine if the application is on a page that needs 
//to have export button(s) injected into it. This has to run on an interval because of the dynamic nature
//of the site.
function intervalCheck() {   
    if(window.location.href.indexOf("https://www.trainerroad.com/app/cycling/workouts/") === 0){
        //console.log('detected workout page')
        setTimeout(() => {
            const success = addExportButtonToWorkoutDetails();
        }, 0);  
    }
    else if(window.location.href.indexOf("https://www.trainerroad.com/app/cycling/workouts") === 0){
        //console.log('detected workout list page')
        setTimeout(() => {
            const success = addExportButtonsToWorkoutListItems();
        }, 0);
    }
}

//start/stop intervalCheck polling.
function stop() {
    clearTimeout(intervalTimer);
}

function start() {
    intervalTimer = setInterval(intervalCheck, 500);
}
start();

//adds export buttons to the /workouts list page in TR.
//list is infinite scrolling/dynamic, so this will ensure all items have an export button
//and add any that are missing each time it is called.
function addExportButtonsToWorkoutListItems(){
    const itemLinks = document.getElementsByClassName('training-item');
    if(itemLinks.length === 0) return false;

    for(var i = 0; i < itemLinks.length; i++){
        const exportBtns = itemLinks[i].getElementsByClassName("export-button");
        if(exportBtns.length < 1){
            //console.log(itemLinks[i].href);
            const workoutId = itemLinks[i].href.split('/').pop().split('-')[0];
            //console.log(workoutId);
            const data = itemLinks[i].getElementsByClassName('info--workout-data');
            const exportBtn = createExportButton(i, workoutId);
            
            data[0].appendChild(exportBtn);
        }
    }

    const found = document.getElementsByClassName("export-button").length === itemLinks.length;
    return found;
}

//adds export button to the /workout/{id} page in TR. Ensures that the button is only added once.
function addExportButtonToWorkoutDetails(){
    const menuButtons = document.getElementsByTagName('button');
    if(menuButtons.length === 0) return false;

    const siblingButton = menuButtons[5].parentNode.parentNode;
    const container = siblingButton.parentNode;
    const exportBtns = container.getElementsByClassName("export-button");

    if(exportBtns.length < 1){
        const workoutId = document.location.href.split('/').pop().split('-')[0];
        const exportBtn = createExportButton("workout", workoutId);
        
        container.insertBefore(exportBtn, siblingButton);
        siblingButton.className += " schedule-button";
        
    }
    const found = document.getElementsByClassName("export-button").length === 1;
    return found;
    
}

//creates an export button with the desired style and hover info for use in mulitple places.
//returns the element created (does not add to the DOM).
function createExportButton(id, workoutId){
    const exportBtn = document.createElement("div");
    exportBtn.id = id + "_export-button";
    exportBtn.className = "export-button";
    const helpIcon = document.createElement("span");
    helpIcon.className = "help-icon";

    exportBtn.innerHTML = "<span>Export</span>";
    exportBtn.appendChild(helpIcon);
    exportBtn.addEventListener('click', (e) => { exportWorkout(workoutId); e.preventDefault(); e.stopPropagation(); });
    helpIcon.addEventListener('mouseenter', () => showHelp(id));
    helpIcon.addEventListener('mouseleave', () => hideHelp(id));
    
    const infoBox = document.createElement("div");
    infoBox.id = id + "_info-box";
    infoBox.className = "info-box";
    infoBox.innerHTML = "<span>Creates a .zwo file of this interval workout for import into Zwift. Copy the exported file from your downloads folder into your Zwift Workouts folder.<br/><br/><span class='subtext'>You should see a folder named <b>Zwift</b> with a folder <b>Workouts</b> in it, and a folder named <b>{Your Zwift User Id}</b> in your user <b>Documents</b> folder. Place your .zwo file in this folder. Make sure Zwift isn't running. You will see your workout in Zwift under Custom Workouts once added.</span></span>";
    exportBtn.appendChild(infoBox);
    return exportBtn;
}

//toggles for hover help tooltip.
function showHelp(id){
    const info = document.getElementById(id + "_info-box");
    info.style.display = "block";    
}
function hideHelp(id){
    const info = document.getElementById(id + "_info-box");
    info.style.display = "none";
}


//generates a link and clicks on it to cause a file to be saved to downloads with filename from text specified.
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

//exports the specified workout by fetching the data from the API, parsing the response, and creating
//the appropriate corresponding elements in the new .zwo file to be created, and triggers
//a download of the newly created file.
function exportWorkout(workoutId){
    const url = "https://www.trainerroad.com/api/workoutdetails/" + workoutId;
    
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