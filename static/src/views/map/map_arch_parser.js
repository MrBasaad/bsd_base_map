/** @odoo-module **/

export class MapArchParser {
    parse(arch, relatedModels, resModel) {
        const fieldNames = ["display_name"];
        let latitudeField = null;
        let longitudeField = null;

        if (arch && arch.tagName === "map") {
            latitudeField = arch.getAttribute("lat");
            longitudeField = arch.getAttribute("lon");
        }

        if (arch && arch.children) {
            for (const child of arch.children) {
                if (child.tagName === "field") {
                    const fieldName = child.getAttribute("name");

                    if (fieldName && !fieldNames.includes(fieldName)) {
                        fieldNames.push(fieldName);
                    }
                }
            }
        }

        if (latitudeField && !fieldNames.includes(latitudeField)) {
            fieldNames.push(latitudeField);
        }

        if (longitudeField && !fieldNames.includes(longitudeField)) {
            fieldNames.push(longitudeField);
        }

        return {
            fieldNames,
            latitudeField,
            longitudeField,
            resModel,
        };
    }
}