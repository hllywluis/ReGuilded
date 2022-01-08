import { ReGuildedExtensionSettings } from "../../../common/reguilded-settings.js";
import { RGThemeConfig } from "../../types/reguilded.js";
import { Theme } from "../../../common/extensions.js";
import ExtensionHandler from "./extension.js";
import SettingsHandler from "./settings.js";

/**
 * Manager that manages ReGuilded's themes
 */
export default class ThemeHandler extends ExtensionHandler<Theme, RGThemeConfig> {
    static allowedSettingsTypes = [undefined, null, "url", "size", "color", "number", "percent"];
    static allowedSettingsValues = ["string", "boolean", "number", "undefined"];
    megaGroup?: Element;
    //idsToCss: { [extensionId: string]: string[] };
    /**
     * Manager that manages ReGuilded's themes
     * @param themesDir The directory of the ReGuilded themes
     * @param settings The settings of the themes
     * @param settingsHandler The extension settings handler
     * @param config The preload config for themes
     */
    constructor(settings: ReGuildedExtensionSettings, settingsHandler: SettingsHandler, config: RGThemeConfig) {
        super(settings, settingsHandler, config);
    }
    /**
     * Initiates themes for ReGuilded and theme manager.
     */
    init() {
        console.log("Initiating theme manager");

        // Make sure <datagroup> elements are ignored
        this.megaGroup = document.createElement("datagroup");
        this.megaGroup.id = "reGl-main";

        this.megaGroup.appendChild(
            Object.assign(document.createElement("styles"), {
                id: "reGl-datagroup",
                innerHTML: "datagroup{display:none;}"
            })
        );
        document.body.appendChild(this.megaGroup);

        this.config.setWatchCallback(this._watchCallback.bind(this));

        for (let theme of this.config.getAll()) {
            this.all.push(theme);
            ~this.enabled.indexOf(theme.id) && this.load(theme);
        }
    }
    private _watchCallback(metadata: Theme, loaded: boolean, previousId: string): void {
        // Since we already have it loaded, we need to update it and unload
        if (loaded && ~this.enabled.indexOf(previousId)) this.unloadWithId(previousId);
        // Update its metadata
        const inAll = this.all.findIndex(other => other.dirname === metadata.dirname);
        if (~inAll) this.all.splice(inAll, 1);

        const propFiles = typeof metadata.files === "string" ? [metadata.files] : metadata.files;
        metadata.files = propFiles;

        // Since we turned string into single-item array,
        // we don't need to check for both types
        if (!Array.isArray(propFiles))
            return console.error(
                new TypeError(`Expected property 'files' to be either a string or an array. In path: ${metadata.dirname}`)
            );

        // Since we already unloaded it or haven't loaded it at all
        if (~this.enabled.indexOf(metadata.id)) this.load(metadata);

        this.all.push(metadata);
    }
    /**
     * Loads a ReGuilded theme
     * @param metadata The ReGuilded theme to load
     */
    load(metadata: Theme) {
        console.log(`Loading theme by ID '${metadata.id}'`);

        this.addStyleSheets(metadata);
    }
    addStyleSheets(metadata: Theme) {
        // Creates a new style group element for that theme
        const group = Object.assign(document.createElement("datagroup"), {
            id: `reGl-theme-${metadata.id}`,
            classList: "reGl-theme"
        });

        this.checkAndDoSettings(metadata, group);

        for (let css of metadata.css)
            group.appendChild(
                Object.assign(document.createElement("style"), {
                    classList: "reGl-css-theme",
                    innerHTML: css
                })
            );

        this.megaGroup.appendChild(group);
    }

    /**
     * Creates settings properties for the theme if they are present.
     * @param metadata Theme metadata
     * @param group The datagroup element of the theme
     */
    checkAndDoSettings(metadata: Theme, group: Element) {
        if (!metadata.settings) return;

        // Using keys instead of values to validate id as well
        for (let propId of metadata.settingsProps) {
            // Validate ID
            if (!propId.match(ExtensionHandler.idRegex))
                return console.warn("Incorrect syntax for property", propId, ". Theme ID:", metadata.id);

            const prop = metadata.settings[propId];
            if (typeof prop !== "object")
                return console.warn(
                    "Expected theme settings property",
                    propId,
                    "to be of type 'object'. Theme ID:",
                    metadata.id
                );

            if (!prop.name) prop.name = propId;

            // Validate property's type (not JS type)
            if (!~ThemeHandler.allowedSettingsTypes.indexOf(prop.type)) {
                console.warn("Unknown settings property type", prop.type, "in theme", metadata.id);
                prop.type = undefined;
            }
            // Check value's type
            const valueType = typeof prop.value;
            if (!~ThemeHandler.allowedSettingsValues.indexOf(valueType)) {
                console.warn("Unknown settings property value type", valueType, "in theme", metadata.id);
                prop.value = prop.value.toString();
            }
        }
        group.appendChild(
            Object.assign(document.createElement("style"), {
                id: `reGl-variables-${metadata.id}`,
                // #app { --a: b; --c: d }
                innerHTML: `#app{${metadata.settingsProps
                    .map(id => {
                        const prop = metadata.settings[id];
                        // If it's of type url, wrap it in url(...)
                        // --id:value
                        // --id:url(value)
                        return `--${id}:${prop.type === "url" ? `url(${prop.value})` : prop.value}`;
                    })
                    .join(";")}}`
            })
        );
    }
    /**
     * Assigns properties to theme settings.
     * @param metadata Theme metadata
     * @param props Theme settings properties
     */
    assignProperties(metadata: Theme, props: { [prop: string]: string | number | boolean }) {
        this.config.setThemeSettings(metadata.id, props);
    }

    /**
     * Unloads a ReGuilded theme.
     * @param metadata ID of the theme to unload from Guilded.
     */
    unload(metadata: Theme) {
        this.unloadWithId(metadata.id);
    }
    private unloadWithId(themeId: string) {
        console.log(`Unloading theme by ID '${themeId}'`);

        const themeElement = document.getElementById(`reGl-theme-${themeId}`);
        themeElement && themeElement.remove();
    }

    /**
     * Checks if given theme based on ID is loaded.
     * @param id The identifier of the theme
     * @returns Theme is loaded
     */
    isLoaded(id: string): boolean {
        return this.enabled.includes(id);
    }
}
