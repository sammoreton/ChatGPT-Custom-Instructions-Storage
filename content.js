(function () {
  let isUIInitialized = false;
  let currentInstructionTitle = null;
  let currentData = {
    instruction1: "",
    instruction2: "",
  };

  // ================================
  // OBSERVER FUNCTIONS
  // ================================
  function initializeObserver() {
    if (!window.location.href.includes("openai.com")) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const popup = document.querySelector(
          'div[data-state="open"] div[role="dialog"]'
        );
        // make sure the popup dialog contains the text "Custom instructions"
        if (popup && popup.innerText.includes("Custom instructions")) {
          if (popup && !isUIInitialized) {
            initializeExtensionUI(popup);
            isUIInitialized = true;
          } else if (!popup && isUIInitialized) {
            isUIInitialized = false;
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  }

  function initializeExtensionUI(popup) {
    const container = createUIContainer();
    const insertionPoint = popup.querySelector("div.p-4.sm\\:p-6.sm\\:pt-4");
    insertionPoint.insertBefore(container, insertionPoint.firstChild);
    const popupDialog = document.querySelector('div[role="dialog"]');
    popupDialog.style.maxWidth = "80vw";

    populateProjectDropdown().then(() => {
      const currentProject = document.querySelector(
        ".chatgpt-extension-project-dropdown"
      ).value;
      if (currentProject) {
        populateInstructionDropdownForProject(currentProject);
      }
    });
  }

  // ================================
  // DATA MANAGEMENT
  // ================================
  function updateCurrentData() {
    const textAreas = document.querySelectorAll('div[role="dialog"] textarea');
    currentData = {
      instruction1: textAreas[0].value,
      instruction2: textAreas[1].value,
    };
  }

  function hasUnsavedChanges() {
    updateCurrentData();
    return getSpecificCustomInstruction(currentInstructionTitle).then(
      (storedData) => {
        if (!storedData) return false;
        return (
          storedData.instruction1 !== currentData.instruction1 ||
          storedData.instruction2 !== currentData.instruction2
        );
      }
    );
  }

  function getCustomInstructions() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject("Error loading data.");
        } else {
          resolve(result);
        }
      });
    });
  }

  function getSpecificCustomInstruction(title) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(title, (result) => {
        if (chrome.runtime.lastError) {
          reject("Error loading data.");
        } else {
          resolve(result[title]);
        }
      });
    });
  }

  // ================================
  // STORAGE OPERATIONS
  // ================================
  function saveCustomInstruction(title, instruction1, instruction2) {
    const currentProject = document.querySelector(
      ".chatgpt-extension-project-dropdown"
    ).value;
    const data = {
      instruction1,
      instruction2,
    };

    chrome.storage.local.get(currentProject, (result) => {
      let projectData = result[currentProject] || {};
      if (!projectData.instructions) {
        projectData.instructions = {};
      }
      projectData.instructions[title] = data;

      chrome.storage.local.set({ [currentProject]: projectData }, () => {
        if (!chrome.runtime.lastError) {
          populateInstructionDropdownForProject(currentProject);
        } else {
          alert("Error saving data. You might have reached the storage limit.");
        }
      });
    });
  }

  function deleteCustomInstruction(title) {
    const currentProject = document.querySelector(
      ".chatgpt-extension-project-dropdown"
    ).value;

    chrome.storage.local.get(currentProject, (result) => {
      let projectData = result[currentProject];
      if (
        projectData &&
        projectData.instructions &&
        projectData.instructions[title]
      ) {
        delete projectData.instructions[title];

        chrome.storage.local.set({ [currentProject]: projectData }, () => {
          if (!chrome.runtime.lastError) {
            populateInstructionDropdownForProject(currentProject);
          } else {
            alert("Error deleting data.");
          }
        });
      }
    });
  }

  // ================================
  // UI COMPONENTS
  // ================================
  function createUIContainer() {
    const container = document.createElement("div");
    container.className = "chatgpt-extension-container";
    container.style =
      "padding: 10px; border-top: 1px solid #ddd; margin-top: 10px;";

    const trashIcon =
      '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="trash h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
    const pencilIcon =
      '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="pencil h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';
    const plusIcon =
      '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="plus h-4 w-4 shrink-0" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    const cloneIcon =
      '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="clone h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    const saveIcon =
      '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="save h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M19 21H5a2 2 0 0 1-2-2V7h16v14z"></path><path d="M17 21v-8H7v8M7 3v5h8"></path></svg>';
    const elements = [
      createText("Backup/Restore:"),
      createButton("Export to JSON", backupData),
      createText("Import from JSON:"),
      createFileInput(restoreData),
      createText("Project:"),
      createProjectDropdown(),
      createButton(plusIcon, addProject),
      createButton(pencilIcon, editProject),
      createButton(trashIcon, deleteProject),
      createText("Instruction:"),
      createDropdown(),
      createButton(plusIcon, addNewInstruction),
      createButton(saveIcon, saveCurrentCustomInstruction),
      createButton(cloneIcon, saveAsNewCustomInstruction),
      createButton(trashIcon, deleteCustomInstructionPrompt),
    ];
    elements.forEach((el) => container.appendChild(el));
    return container;
  }

  function createText(text) {
    const textElement = document.createElement("p");
    textElement.innerText = text;
    textElement.className = "text-muted pb-3 pt-2 text-sm text-gray-600";
    return textElement;
  }

  function createDropdown() {
    const dropdown = document.createElement("select");
    dropdown.className = "chatgpt-extension-dropdown";
    dropdown.style = "width: 60%; margin-right: 10px; color:black";
    dropdown.addEventListener("change", () => {
      hasUnsavedChanges().then((changed) => {
        if (
          changed &&
          !confirm("You have unsaved changes. Do you want to discard them?")
        ) {
          return;
        }
        loadCustomInstruction(dropdown.value);
        currentInstructionTitle = dropdown.value;
      });
    });

    return dropdown;
  }

  function createFileInput(onChange) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.addEventListener("change", onChange);
    return input;
  }

  function createButton(svgIcon, onClick) {
    const button = document.createElement("button");
    // if trashicon then btn danger else btn primary
    button.className = `btn relative mr-2 ${
      svgIcon.includes("trash") ? "btn-danger" : "btn-primary"
    }`;
    if (svgIcon === "Backup") {
      button.innerText = svgIcon;
    } else {
      // Instead of adding text, append the provided SVG icon
      button.innerHTML = svgIcon;
    }

    button.addEventListener("click", onClick);
    return button;
  }

  function createProjectDropdown() {
    const dropdown = document.createElement("select");
    dropdown.className = "chatgpt-extension-project-dropdown";
    dropdown.style = "width: 60%; margin-right: 10px; color:black";
    dropdown.addEventListener("change", () => {
      populateInstructionDropdownForProject(dropdown.value);
    });
    return dropdown;
  }

  function populateProjectDropdown() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        const dropdown = document.querySelector(
          ".chatgpt-extension-project-dropdown"
        );
        dropdown.innerHTML = "";

        for (let key in result) {
          if (result[key].instructions) {
            const option = document.createElement("option");
            option.value = key;
            option.text = key;
            dropdown.add(option);
          }
        }
        resolve();
      });
    });
  }

  function populateInstructionDropdownForProject(project) {
    chrome.storage.local.get(project, (result) => {
      const dropdown = document.querySelector(".chatgpt-extension-dropdown");
      dropdown.innerHTML = "";

      if (result && result[project] && result[project].instructions) {
        let firstInstructionTitle; // Store the first instruction title

        Object.keys(result[project].instructions).forEach(
          (instructionTitle, index) => {
            if (index === 0) firstInstructionTitle = instructionTitle; // If it's the first instruction, store the title

            const option = document.createElement("option");
            option.value = instructionTitle;
            option.text = instructionTitle;
            dropdown.add(option);
          }
        );

        if (firstInstructionTitle) {
          loadCustomInstruction(firstInstructionTitle); // Load the first instruction
          currentInstructionTitle = firstInstructionTitle; // Set the current instruction title to the first one
        }
      }
    });
  }

  // ================================
  // BUTTON ACTIONS
  // ================================
  function addProject() {
    const projectName = prompt("Enter the name for the new project:");
    if (projectName) {
      chrome.storage.local.set({ [projectName]: { instructions: {} } }, () => {
        if (!chrome.runtime.lastError) {
          populateProjectDropdown().then(() => {
            // Select the newly created project
            const projectDropdown = document.querySelector(
              ".chatgpt-extension-project-dropdown"
            );
            projectDropdown.value = projectName;
            // Also, ensure to populate the custom instructions for this project (should be empty initially)
            populateInstructionDropdownForProject(projectName);
          });
        } else {
          alert("Error creating the new project.");
        }
      });
    }
  }

  function editProject() {
    const currentProject = document.querySelector(
      ".chatgpt-extension-project-dropdown"
    ).value;
    const newProjectName = prompt(
      "Enter a new name for the project:",
      currentProject
    );

    if (newProjectName && newProjectName !== currentProject) {
      chrome.storage.local.get(currentProject, (result) => {
        if (result) {
          chrome.storage.local.set(
            { [newProjectName]: result[currentProject] },
            () => {
              if (!chrome.runtime.lastError) {
                chrome.storage.local.remove(
                  currentProject,
                  populateProjectDropdown
                );
              }
            }
          );
        }
      });
    }
  }

  function deleteProject() {
    const currentProject = document.querySelector(
      ".chatgpt-extension-project-dropdown"
    ).value;
    const confirmDeletion = confirm(
      "Deleting this project will remove all its instructions. Are you sure?"
    );

    if (confirmDeletion) {
      chrome.storage.local.remove(currentProject, () => {
        if (!chrome.runtime.lastError) {
          populateProjectDropdown().then(() => {
            // After populating the project dropdown, fetch the newly selected project
            const newSelectedProject = document.querySelector(
              ".chatgpt-extension-project-dropdown"
            ).value;

            // Populate the instruction dropdown for the newly selected project
            if (newSelectedProject) {
              populateInstructionDropdownForProject(newSelectedProject);
            }
          });
        } else {
          alert("Error deleting project.");
        }
      });
    }
  }

  function saveCurrentCustomInstruction() {
    const textAreas = document.querySelectorAll('div[role="dialog"] textarea');
    if (currentInstructionTitle) {
      saveCustomInstruction(
        currentInstructionTitle,
        textAreas[0].value,
        textAreas[1].value
      );
    } else {
      const title = prompt("Enter a title for this new custom instruction:");
      if (title) {
        saveCustomInstruction(title, textAreas[0].value, textAreas[1].value);
      }
    }
  }

  function addNewInstruction() {
    hasUnsavedChanges().then((changed) => {
      if (
        changed &&
        !confirm("You have unsaved changes. Do you want to discard them?")
      ) {
        return;
      }

      const title = prompt("Enter a title for this new custom instruction:");
      if (title) {
        currentInstructionTitle = title;
        const textAreas = document.querySelectorAll(
          'div[role="dialog"] textarea'
        );
        setTextAreaValue(textAreas[0], "");
        setTextAreaValue(textAreas[1], "");

        // Save the new instruction immediately with empty text areas
        saveCustomInstruction(title, textAreas[0].value, textAreas[1].value);

        const dropdown = document.querySelector(".chatgpt-extension-dropdown");
        const option = document.createElement("option");
        option.value = title;
        option.text = title;
        dropdown.add(option);
        dropdown.value = title;
      }
    });
  }

  function loadCustomInstruction(title) {
    const currentProject = document.querySelector(
      ".chatgpt-extension-project-dropdown"
    ).value;
    chrome.storage.local.get(currentProject, (result) => {
      if (
        result &&
        result[currentProject] &&
        result[currentProject].instructions &&
        result[currentProject].instructions[title]
      ) {
        let instructionData = result[currentProject].instructions[title];

        let instruction1TextArea = document.querySelectorAll(
          'div[role="dialog"] textarea'
        )[0];
        let instruction2TextArea = document.querySelectorAll(
          'div[role="dialog"] textarea'
        )[1];

        setTextAreaValue(instruction1TextArea, instructionData.instruction1);
        setTextAreaValue(instruction2TextArea, instructionData.instruction2);
      }
    });
  }

  function setTextAreaValue(textArea, value) {
    textArea.focus();
    textArea.value = value;
    const event = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    textArea.dispatchEvent(event);
  }

  function saveAsNewCustomInstruction() {
    const title = prompt("Enter a title for this new custom instruction:");
    if (title) {
      const textAreas = document.querySelectorAll(
        'div[role="dialog"] textarea'
      );
      saveCustomInstruction(title, textAreas[0].value, textAreas[1].value);
    }
  }

  function deleteCustomInstructionPrompt() {
    const dropdown = document.querySelector(".chatgpt-extension-dropdown");
    const confirmDeletion = confirm(
      "Are you sure you want to delete this custom instruction?"
    );
    if (confirmDeletion) {
      deleteCustomInstruction(dropdown.value);
    }
  }

  function backupData() {
    chrome.storage.local.get(null, (result) => {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(result));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  }

  function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            alert("Error during restoration. Please try again.");
          } else {
            chrome.storage.local.set(data, () => {
              if (chrome.runtime.lastError) {
                alert("Error during restoration. Please try again.");
              } else {
                alert("Restoration successful!");
                location.reload(); // Refresh the page to reflect restored data
              }
            });
          }
        });
      } catch (error) {
        alert("Invalid backup file. Please upload a valid backup.");
      }
    };
    reader.readAsText(file);
  }
  initializeObserver();
})();
