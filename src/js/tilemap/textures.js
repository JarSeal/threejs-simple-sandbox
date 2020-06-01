
export function getModuleTexture(moduleId, level, skinId, type, part) {
    let textureKey = "m"+moduleId+"-l"+level+"-s"+skinId+"-"+type+"-"+part,
        texturePath = moduleTextures[textureKey];
    if(!texturePath) {
        console.error("Texture with key "+textureKey+" not found.");
        return {
            texturePath: null,
            key: textureKey,
            error: "Texture with key "+textureKey+" not found.",
        };
    } else {
        return {
            texturePath: texturePath,
            key: textureKey,
        };
    }
}

let moduleTextures = {
    "m2-l1-s1-map-interior": "cargo-hall/interior-baked.png",
    "m2-l1-s1-light-interior": "cargo-hall/interior-lightmap.png",
    "m2-l1-s1-bump-interior": "cargo-hall/interior-bump.png",
    "m2-l1-s1-normal-interior": "cargo-hall/interior-normal.png",

    "m2-l1-s2-map-interior": "cargo-hall/interior-baked-red.png",
    "m2-l1-s3-map-interior": "cargo-hall/interior-baked-blue.png",
    "m2-l1-s4-map-interior": "cargo-hall/interior-baked-green.png",

    "m2-l1-s1-map-exterior": "cargo-hall/exterior-baked.png",
    "m2-l1-s1-light-exterior": "cargo-hall/exterior-lightmap.png",
    "m2-l1-s1-bump-exterior": "cargo-hall/exterior-bump.png",
    "m2-l1-s1-normal-exterior": "cargo-hall/exterior-normal.png",
};