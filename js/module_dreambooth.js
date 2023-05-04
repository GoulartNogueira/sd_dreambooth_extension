let dreamSelect;
let dreamConfig;
let showAdvanced;
let dreamProgress;
let dreamGallery;
let lastConcept = -1;
let conceptsList = [];
let dbListenersLoaded = false;
let dbModelCol;
let dbStatusCol;

// Define the Bootstrap "md" breakpoint as a constant
const mdBreakpoint = 990;

$(".hide").hide();

// Register the module with the UI. Icon is from boxicons by default.
const dbModule = new Module("Dreambooth", "moduleDreambooth", "moon", false, 2, initDreambooth);

function initDreambooth() {
    console.log("Init dreambooth");

    let selects = $(".modelSelect").modelSelect();
    for (let i = 0; i < selects.length; i++) {
        let elem = selects[i];
        if (elem.container.id === "dreamModelSelect") {
            dreamSelect = elem;
        }
    }

    let prog_opts = {
    let prog_opts = {
        "primary_status": "Status 1", // Status 1 text
        "secondary_status": "Status 2", // Status 2...
        "bar1_progress": 0, // Progressbar 1 position
        "bar2_progress": 0, // etc
        "id": "dreamProgress" // ID of the progress group
    }
        "bar2_progress": 0, // etc
        "id": "dreamProgress" // ID of the progress group
    }

    let gallery_opts = {
    let gallery_opts = {
        "thumbnail": true,
        "closeable": false,
        "show_maximize": true,
        "start_open": true,
        "id": "dreamProgress"
    }

    window.addEventListener('resize', handleResize);

    // Call the function once on page load to ensure the correct container is shown
    handleResize();
    let pg = document.getElementById("dreamProgress");
    console.log("Progress: ", pg);
    dreamProgress = new ProgressGroup(document.getElementById("dreamProgress"), prog_opts);
    dreamProgress.setOnCancel(function() {
        $(".dbTrainBtn").addClass("hide");
        $(".dbSettingBtn").removeClass("hide");
    });

    dreamProgress.setOnComplete(function() {
        $(".dbTrainBtn").addClass("hide");
        $(".dbSettingBtn").removeClass("hide");
    });

    // Gallery creation. Options can also be passed to .update()
    dreamGallery = new InlineGallery(document.getElementById('dreamGallery'), gallery_opts);

    console.log("Gallery and progress: ", dreamProgress, dreamGallery);

    $(".db-slider").BootstrapSlider();

    if (!dbListenersLoaded) {
        loadDbListeners();
    }

    registerSocketMethod("train_dreambooth", "train_dreambooth", dreamResponse);

    dreamConfig = dbModule.systemConfig;
    console.log("Dream settings: ", dreamConfig);
    showAdvanced = dreamConfig["show_advanced"];
    if (showAdvanced) {
        $(".db-advanced").show();
        $(".db-basic").hide();
    } else {
        $(".db-advanced").hide();
        $(".db-basic").show();
    }
}


function handleResize() {
    // Get the current window width
    const windowWidth = window.innerWidth;
    dbModelCol = document.getElementById("dbModelCol");
    dbStatusCol = document.getElementById("dbStatusCol");

    let statusCard = document.getElementById("dreamStatus");
    // If the window is less than the "md" breakpoint
    if (windowWidth <= mdBreakpoint) {
        // Check if statusCard is not already a child of dbModelCol
        if (dbModelCol.contains(statusCard) === false) {
            // Append statusCard to dbModelCol
            dbModelCol.prepend(statusCard);
            //dbModelCol.appendChild(statusCard);
        }
        // Hide dbStatusCol
        dbStatusCol.style.display = "none";
    } else {
        // Check if statusCard is not already a child of dbStatusCol
        if (dbStatusCol.contains(statusCard) === false) {
            // Append statusCard to dbStatusCol
            dbStatusCol.appendChild(statusCard);
        }
        // Show dbStatusCol
        dbStatusCol.style.display = "block";
    }
}

function loadDbListeners() {
    $("#db_use_shared_src").click(function () {
        let checked = $(this).is(":checked");
        if (checked) {
            console.log("CHECKED");
            $("#shared_row").show();
        } else {
            console.log("NOT CHECKED");
            $("#shared_row").hide();
        }
    });

    $("#db_create_model").click(function () {
        let data = {};
        $(".newModelParam").each(function (index, elem) {
            let key = $(elem).data("key");
            let val = $(elem).val();
            if ($(elem).is(":checkbox")) {
                val = $(elem).is(":checked");
            }
            if ($(elem).is(".model-select")) {
                let parent = $(elem).parent().parent();
                let ms = $(parent).modelSelect();
                let realElement = ms[0];
                val = realElement.currentModel;
            }
            data[key] = val;
        });
        sendMessage("create_dreambooth", data, false, "dreamProgress").then(() => {
        sendMessage("create_dreambooth", data, false, "dreamProgress").then(() => {
            dreamSelect.refresh();
        });
    });

    $("#db_load_settings").click(function () {
        let selected = dreamSelect.getModel();
        console.log("Load model settings click: ", selected);
        if (selected === undefined) {
            alert("Please select a model first!");
        } else {
            sendMessage("get_dreambooth_settings", {model: selected}, true).then((result) => {
                for (let key in result) {
                    let elem = $(`#${key}`);
                    if (elem.length) {
                        if (elem.is(":checkbox")) {
                            elem.prop("checked", result[key]);
                        } else {
                            elem.val(result[key]);
                        }
                    }
                }
            });
        }
    });

    $("#db_train").click(function () {
        let data = getSettings();
        console.log("Settings: ", data);
        sendMessage("train_dreambooth", data, true, "dreamProgress").then((result) => {
            $(".dbSettingBtn").addClass("hide");
            $(".dbTrainBtn").removeClass("hide").show();
            console.log("Res: ", result);
        });
    });

    $("#db_cancel").click(function () {
        $(".dbSettingBtn").removeClass("hide");
        $(".dbTrainBtn").addClass("hide");
    });

    $("#db_load_params").click(function () {
        let selected = dreamSelect.getModel();
        console.log("Load model settings click: ", selected);
        if (selected === undefined) {
            alert("Please select a model first!");
        } else {
            sendMessage("get_db_config", {model: selected}, true).then((result) => {
                console.log("Params: ", result);
                for (let key in result["config"]) {
                    if (key === "concepts_list") {
                        let concepts = result["config"][key];
                        console.log("Concepts: ", concepts);
                        loadConcepts(concepts);
                        continue;
                    }
                    let elem = $(`.db-slider[data-elem_id="${key}"]`);
                    if (!elem.length) {
                        elem = $(`#${key}`);
                    }
                    let value = result["config"][key];
                    if (elem.length) {
                        console.log("Checking: ", elem, key, value);

                        if (elem[0].classList.contains("db-slider")) {
                            let slider = $(elem[0]).data("BootstrapSlider");
                            if (slider) {
                                slider.updateValue(value);
                            }
                        } else if (elem.is(":checkbox")) {
                            elem.prop("checked", value);
                        } else {
                            elem.val(value);
                        }
                    }
                }

            });
        }
    });

    $("#db_save_config").click(function () {
        let selected = dreamSelect.getModel();
        console.log("Save model settings click: ", selected);
        if (selected === undefined) {
            alert("Please select a model first!");
        } else {
            let data = getSettings();
            sendMessage("save_db_config", data, true).then((result) => {
                console.log("Res: ", result);
            });
        }
    });

    $("#db_create_from_hub").change(function () {
        if ($(this).is(":checked")) {
            $("#hub_row").show();
            $("#local_row").hide();
        } else {
            $("#hub_row").hide();
            $("#local_row").show();
        }
    });

    $("#db_concept_add").click(function () {
        addConcept(false);
    });

    $("#db_concept_remove").click(function (event) {
        event.preventDefault();
        removeConcept();
    });

    keyListener.register("ctrl+Enter", "#dreamSettings", startDreambooth);

    dbListenersLoaded = true;
}

function loadConcepts(concepts) {
    let conceptsContainer = $("#advancedConcepts");
    conceptsList = [];
    conceptsContainer[0].innerHTML = "";
    console.log("Loading: ", concepts);
    if (concepts.length === 0 && showAdvanced) {
        let removeConceptButton = $("#db_concept_remove");
        let controlGroup = $("#conceptControls");
        controlGroup.removeClass("btn-group");
        removeConceptButton.addClass("hide");
        removeConceptButton.hide();
        return;
    }

    if (showAdvanced) {
        for (let i = 0; i < concepts.length; i++) {
            let concept = concepts[i];
            addConcept(concept);
        }
    } else {
        if (concepts.length > 0) {
            let concept = concepts[0];
            addConcept(concept);
        } else {
            addConcept(false);
        }
    }
}

function addConcept(concept = false) {
    let conceptsContainer = $("#advancedConcepts");
    let removeConcept = $("#db_concept_remove");
    let controlGroup = $("#conceptControls");
    if (showAdvanced) {
        controlGroup.addClass("btn-group");
        removeConcept.removeClass("hide");
        controlGroup[0].style.display = "flex";
        removeConcept.show();
    } else {
        controlGroup.hide();
    }

    let fileBrowserKeys = ["class_data_dir", "instance_data_dir"];
    let bootstrapSliderKeys = ["class_guidance_scale", "class_infer_steps", "n_save_sample", "num_class_images_per", "save_guidance_scale", "save_infer_steps"];
    let textFieldKeys = ["class_negative_prompt", "save_sample_negative_prompt", "save_sample_prompt", "save_sample_template"];
    let textKeys = ["class_prompt", "class_token", "instance_prompt", "instance_token"];
    let numberKeys = ["sample_seed"];

    if (!showAdvanced) {
        bootstrapSliderKeys = [];
        textFieldKeys = [];
    }

    if (!concept) {
        concept = {
            "class_data_dir": "",
            "class_guidance_scale": 7.5,
            "class_infer_steps": 20,
            "class_negative_prompt": "blurry, deformed, bad",
            "class_prompt": "[filewords]",
            "class_token": "",
            "instance_data_dir": "",
            "instance_prompt": "[filewords]",
            "instance_token": "",
            "n_save_sample": 0,
            "num_class_images_per": 0,
            "sample_seed": -1,
            "save_guidance_scale": 7.5,
            "save_infer_steps": 20,
            "save_sample_negative_prompt": "blurry, deformed, bad",
            "save_sample_prompt": "[filewords]"
        };
    }

    conceptsList.push(concept);

    const c_keys = [
        "instance_data_dir",
        "class_data_dir",
        "instance_prompt",
        "class_prompt",
        "save_sample_prompt",
        "sample_template",
        "instance_token",
        "class_token",
        "num_class_images_per",
        "n_save_sample",
        "class_negative_prompt",
        "save_sample_negative_prompt",
        "class_guidance_scale",
        "save_guidance_scale",
        "class_infer_steps",
        "save_infer_steps",
        "sample_seed"
    ];

    let i = conceptsContainer.children().length + 1;

    let formAccordion = $(`<div class="accordion-item" data-index="${i}">
                <h2 class="accordion-header" id="concept-${i}">
                  <button class="accordion-button" type="button" data-bs-toggle="collapse"
                    data-bs-target="#collapse-${i}" aria-expanded="true"
                    aria-controls="collapse-${i}">Concept ${i}</button>
                </h2>
                <div id="collapse-${i}" class="accordion-collapse collapse" aria-labelledby="concept-${i}"
                     data-bs-parent="#advancedConcepts">
                  <div class="accordion-body">
                    <form id="form-${i}"></form>
                  </div>
                </div>
              </div>`);

    formAccordion.click(function (event) {
        event.preventDefault();
        let idx = $(this).data("index");
        console.log("Clicked: ", idx);
        lastConcept = idx;
    });

    formAccordion.blur(function (event) {
        event.preventDefault();
        console.log("The element has lost focus.");
    });

    conceptsContainer.append(formAccordion);
    let formElements = $("#form-" + i);
    // create arrays for each element type

    // loop through each key in concept
    for (let key_idx in c_keys) {
        let key = c_keys[key_idx];
        let inputId = `concept_${i}-${key}`;
        // check if the key is in the fileBrowserKeys array
        if (fileBrowserKeys.includes(key)) {
            let fileBrowserLabel = key === "class_data_dir" ? "Class Data Directory" : "Instance Data Directory";
            let fileBrowser = $(`
                    <div class="form-group">
                        <label>${fileBrowserLabel}</label>
                        <div id="${inputId}" class="db-file-browser dbInput" data-elem_id="${inputId}"></div>
                    </div>
                `);
            formElements.append(fileBrowser);
            console.log("Creating file browser: ", concept, key);
            new FileBrowser(document.getElementById(`${inputId}`), {
                "dropdown": true,
                "showInfo": false,
                "showTitle": false,
                "showSelectButton": true,
                "selectedElement": concept[key]
            });
        }
        // check if the key is in the bootstrapSliderKeys array
        else if (bootstrapSliderKeys.includes(key)) {
            let bootstrapSliderLabel = key === "class_guidance_scale" ? "Class Guidance Scale" :
                key === "class_infer_steps" ? "Class Inference Steps" :
                    key === "n_save_sample" ? "N Save Samples" :
                        key === "num_class_images_per" ? "Images per Class" :
                            key === "save_guidance_scale" ? "Sample Guidance Scale" :
                                "Sample Inference Steps";
            let sliderStep = key.indexOf("scale") !== -1 ? 0.5 : 1;
            let sliderMax = key.indexOf("scale") !== -1 ? 20 : 100;
            let sliderMin = (key.indexOf("sample") !== -1 || key.indexOf("images") !== -1) ? 0 : 1;
            let sliderDiv = $(`
                    <div class="form-group">
                        <label>${bootstrapSliderLabel}</label>
                        <div class="db-slider dbInput" data-elem_id="${inputId}" data-max="${sliderMax}" data-min="${sliderMin}" data-step="${sliderStep}" data-value="${concept[key]}" data-label="${bootstrapSliderLabel}"></div>
                    </div>
                `);
            formElements.append(sliderDiv);
            sliderDiv.find(".db-slider")
                .BootstrapSlider();
        }
        // check if the key is in the textFieldKeys array
        else if (textFieldKeys.includes(key)) {
            let textFieldLabel = key === "class_negative_prompt" ? "Class Negative Prompt" :
                key === "save_sample_negative_prompt" ? "Sample Negative Prompt" :
                    key === "save_sample_prompt" ? "Sample Prompt" :
                        "Sample Template";
            let textField = $(`
                        <div class="form-group">
                            <label for="${inputId}">${textFieldLabel}</label>
                            <input type="text" class="form-control dbInput" id="${inputId}" value="${concept[key]}">
                        </div>
                    `);
            formElements.append(textField);
        } else if (textKeys.includes(key)) {
            let textLabel = key === "class_prompt" ? "Class Prompt" :
                key === "class_token" ? "Class Token" :
                    key === "instance_prompt" ? "Instance Prompt" :
                        "Instance Token";
            let text = $(`
                        <div class="form-group">
                            <label for="${inputId}">${textLabel}</label>
                            <input type="text" class="form-control dbInput" id="${inputId}" value="${concept[key]}">
                        </div>
                    `);

            formElements.append(text);
        } else if (numberKeys.includes(key)) {
            let numberLabel = key === "sample_seed" ? "Sample Seed" : "";
            let number = $(`
                        <div class="form-group">
                            <label for="${inputId}">${numberLabel}</label>
                            <input type="number" class="form-control dbInput" id="${inputId}" value="${concept[key]}">
                        </div>
                    `);
            formElements.append(number);
        }
    }
    // create bootstrap slider elements
    formElements.find(".db-slider").BootstrapSlider();
}

function removeConcept() {
    if (lastConcept === -1) {
        return;
    }
    let c_idx = lastConcept - 1;
    // Remove the element from conceptsList at index c_idx
    conceptsList.splice(c_idx, 1);
    console.log("Removed concept: ", c_idx, conceptsList);
    loadConcepts(conceptsList);
}

function getSettings() {
    let settings = {};
    settings["model"] = dreamSelect.getModel();

    // Just create one concept if advanced is disabled
    let concepts_list = [];

    let inputElements = $('[id^="concept_"]');

    let values = [];
    inputElements.each((index, element) => {
        console.log("Parsing concept input: ", element, element.value);
        let conceptIndex = element.id.split("-")[0].split("_")[1];
        let key = element.id.split("-")[1];

        let value = (element.dataset.hasOwnProperty("value") ? element.dataset.value : element.value);
        if (value === "undefined") {
            value = "";
        }
        if (!isNaN(parseInt(value))) {
            value = parseInt(value);
        } else if (!isNaN(parseFloat(value))) {
            value = parseFloat(value);
        }

        let found = false;
        for (let i = 0; i < values.length; i++) {
            if (values[i]["conceptIndex"] === conceptIndex) {
                values[i][key] = value;
                found = true;
                break;
            }
        }
        if (!found) {
            let newValue = {"conceptIndex": conceptIndex};
            newValue[key] = value;
            console.log("Creating new value: ", newValue);
            values.push(newValue);
        }
    });


    let otherInputs = $(".dbInput");
    otherInputs.each(function () {
        let element = $(this);
        let id = element.data("elem_id") || element.attr("id");
        let slider = element.data("BootstrapSlider");
        let file = element.data("fileBrowser");
        let value;

        if (slider) {
            console.log("SLIDER", slider);
            value = parseInt(slider.value);
        } else if (file) {
            console.log("Filebrowser", file);
            let browser = element.FileBrowser();
            value = browser.value;
        } else if (element.is(":checkbox")) {
            value = element.is(":checked");
        } else if (element.is(":radio")) {
            if (element.is(":checked")) {
                value = element.val();
            }
        } else if (element.is("select")) {
            value = element.val();
        } else if (element.is("input[type='number']")) {
            value = parseFloat(element.val());
        } else {
            value = element.val();
        }

        console.log("Input", id, value);
        settings[id] = value;
    });


    let highestConceptIndex = -1;
    const concepts = {};

    for (let key in settings) {
        if (key.includes("concept_")) {
            const conceptIndex = parseInt(key.split("-")[0].split("_")[1]);
            const conceptKey = key.split("-")[1];
            if (!concepts[conceptIndex]) {
                concepts[conceptIndex] = {};
            }
            concepts[conceptIndex][conceptKey] = settings[key];
            delete settings[key];
            if (conceptIndex > highestConceptIndex) {
                highestConceptIndex = conceptIndex;
            }
        }
    }
    for (let concept in concepts) {
        concepts_list.push(concepts[concept]);
    }
    settings["concepts_list"] = concepts_list;

    console.log("Collected settings: ", settings);


    return settings;
}


function dreamResponse() {

}

function startDreambooth() {

}
