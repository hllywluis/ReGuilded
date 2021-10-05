﻿import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import ActionSection from "./menu/ActionSection";
import {ThemeSettingsHandler} from "../index";
import ExtensionItem from "./ExtensionItem";
import ErrorBoundary from "./ErrorBoundary";
import ActionItem from "./menu/ActionItem";

// Awww yeaaahh
const { ModalStack } = ReGuilded.addonLib;
const { ColorField, StringField } = ReGuilded.addonLib.SettingsFields;

// This is used to convert the css variable names from kebab case to.. normal case?
// some-var-name > Some Var Name

/**
 * Makes CSS variable's name more readable
 * @param {string} name The name of the CSS variable.
 * @example "--fizz-buzz" => "Fizz Buzz"
 * @returns Formatted CSS variable
 */
function formatCssVarName(name) {
    return name
        .split("-")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

/**
 * Opens up variable settings for this theme.
 * @param {[line: string, propName: string, propValue: string][]} variables The list of CSS variables of this theme
 * @param {string} id The identifier of this theme
 */
function openThemeSettings(variables, id) {
    /**
     * Handles any changes that occurred in theme settings.
     * @param {string} propName The name of the property
     * @param {string} defaultValue The default value that the property has
     * @param {string} value The current value of the property
     * @returns {void}
     */
    function handleCallback(propName, defaultValue, value) {
        if (value === defaultValue)
            return ThemeSettingsHandler.overrides[id].reset(propName);
        else
            ThemeSettingsHandler.overrides[id].set(propName, value);
    }
    
    const components = variables.map(([, name, defaultValue]) => {
        /** @type {string} */
        const value = ThemeSettingsHandler.overrides[id].get(name, defaultValue);
        
        // If it's a hex colour, return a colour field
        if (defaultValue.startsWith("#")) return (
            <ColorField
                title={formatCssVarName(name)}
                defaultValue={value}
                key={name}
                callback={handleCallback.bind(null, name, defaultValue)}/>
        );

        else return (
            <StringField
                title={formatCssVarName(name)}
                defaultValue={value}
                key={name}
                callback={handleCallback.bind(null, name, defaultValue)}/>
        );
    }).filter(v => v);

    ModalStack.push(
        <ErrorBoundary>
            <div className="ThemeSettings">
                { components }
            </div>
        </ErrorBoundary>
    );
}

/**
 * Creates a new theme item component.
 * @param {{ id: string, name: string, css: string[], description: string?}} props Component properties
 * @returns {React.Component} Theme item component
 */
function ThemeItem({ id, name, css: cssList, dirname, description }) {
    const css = cssList[0];
    
    // Some memos, for that tasty performance boost that we don't need
    // Literally 0 reason to use a memo for this, but I did anyways
    const fp = React.useMemo(() => join(dirname, css), [dirname, css]);
    // Get the source code and store it in a memo
    const data = React.useMemo(() => readFileSync(fp, "utf8"), [dirname, css]);
    
    // Match all of our variables in and place them in an array
    /** @type {[line: string, propName: string, propValue: string]} */
    const variables = React.useMemo(() => [...data.matchAll(/--(\S+?):(?:\s*)?(\S*?);/g)]);
    
    /** @type {boolean} */
    const themeEnabled = ~ReGuilded.themesManager.enabled.indexOf(id)
    
    /**
     * Changes theme's enabled state.
     * @param {boolean} state The state of the switch
     */
    function handleEnabledStateChanged(state) {
        // FIXME: This gets called once SimpleToggle is initiated and causes themes or add-ons 
        // FIXME: to get unloaded/loaded again when opening settings.
        const config = ReGuilded.settingsManager.config.themes;
        const themes = ReGuilded.themesManager;
        
        // The new state is true, enable the theme and add it to the config
        if (state) {
            ReGuilded.themesManager.load(ReGuilded.themesManager.all.find(theme => theme.id === id));
            config.enabled = [...config.enabled, id];
        }
        // The state is false, disable the theme and remove it from the config
        else {
            ReGuilded.themesManager.unload(id);
            config.enabled = config.enabled.filter(_id => _id !== id);
        }
        
        // Spaghetti
        themes.enabled = config.enabled;
        
        // Re-init all theme data
        ThemeSettingsHandler.reInitAll();
        
        // Write the new date
        writeFileSync(
            join(ReGuilded.settingsManager.directory, "settings.json"),
            JSON.stringify(ReGuilded.settingsManager.config, null, "\t")
        );
    }
        
    return (
        <ErrorBoundary>
            <ExtensionItem id={id} name={name} type="theme"
                description={description} fp={fp} dirname={dirname}
                onToggle={handleEnabledStateChanged}
                sections={[{
                    name: "Theme",
                    type: "rows",
                    actions: [
                        { label: "Settings", icon: "icon-settings", onAction: openThemeSettings.bind(null, variables, id) }
                    ]
                }]}
                enabled={themeEnabled}>
            </ExtensionItem>
        </ErrorBoundary>
    );
}

/**
 * Creates a new theme settings component.
 * @returns {React.ReactElement}
 */
export default function ThemeSettings() {
    const [themes, initThemes] = React.useState(ReGuilded.themesManager.all);

    return (
        <ErrorBoundary>
            <div className="ReGuildedSettings ThemeSettings">
                <div className="SettingsGroup">
                    { themes?.length ? (
                        <div className="ExtensionItemsList">
                            { themes.map(theme => <ThemeItem key={theme.id} {...theme}/>) }
                        </div>
                    ) : (
                        <NullState type="nothing-here" title="There are no themes installed." subtitle="You have not installed any Guilded theme yet. Open up themes directory and install a theme." alignment="center" buttonText="Open directory" onClick={e => console.log('Null state button clicked', e)} />
                    ) }
                </div>
            </div>
        </ErrorBoundary>
    );
}