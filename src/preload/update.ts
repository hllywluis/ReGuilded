import reGuildedInfo from "../common/reguilded.json";
import { createWriteStream } from "fs-extra";
import { join } from "path";
import { get } from "https";

export default async function handleUpdate(updateInfo: VersionJson) {
    const downloadUrl = updateInfo.assets[0].browser_download_url;
    const downloadPath = join(__dirname);

    console.log(downloadUrl, downloadPath)

    /**
     * Per comment here: https://github.com/electron/electron/issues/9304#issuecomment-297628476
     * Using the process.noAsar solution it does allow the asar to download, but the file is completely empty.
     */

    process.noAsar = true
    return new Promise<void>(async (resolve, reject) => {
        get(downloadUrl, (response) => {
            response.pipe(createWriteStream(downloadPath)).on("finish", () => {
                console.log("Download Finished");

                process.noAsar = false;
                resolve();
            });
        });
    });
}

export type AssetObj = {
    browser_download_url: string,
    name: string
}

export type VersionJson = {
    version: string;
    assets: Array<AssetObj>;
};

export async function checkForUpdate(): Promise<[boolean, VersionJson]> {
    return new Promise<VersionJson>((resolve, reject) => {
        fetch("https://api.github.com/repos/ReGuilded/ReGuilded/releases/latest").then(response => response.json(), e => reject(e)).then(json => {
            resolve({
                version: json.tag_name,
                assets: json.assets
            });
        });
    }).then(json => [(window.updateExists = (json.assets.length !== 0 && json.version !== reGuildedInfo.version)), (window.latestVersionInfo = json)])
}