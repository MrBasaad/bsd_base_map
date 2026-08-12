/** @odoo-module **/

import { KeepLast } from "@web/core/utils/concurrency";

export class MapModel {
    constructor(orm, resModel, fields, archInfo, domain) {
        this.orm = orm;
        this.resModel = resModel;
        this.fields = fields || {};
        this.domain = domain || [];
        this.archInfo = archInfo || {};

        this.fieldNames = this.archInfo.fieldNames || ["display_name"];
        this.latitudeField = this.archInfo.latitudeField;
        this.longitudeField = this.archInfo.longitudeField;

        this.keepLast = new KeepLast();

        this.records = [];
        this.recordsLength = 0;
    }

    async load() {
        const modelFields = Object.keys(this.fields);

        const fields = [
            ...new Set([
                "display_name",
                ...modelFields,
                ...this.fieldNames,
            ]),
        ];

        const result = await this.keepLast.add(
            this.orm.webSearchRead(
                this.resModel,
                this.domain,
                {
                    specification: Object.fromEntries(
                        fields.map((fieldName) => [
                            fieldName,
                            {},
                        ])
                    ),
                    limit: 0,
                }
            )
        );

        this.recordsLength = result.length || 0;
        this.records = result.records || [];

        if (this.latitudeField && this.longitudeField) {
            this.records = this.records.filter((record) => {
                const lat = record[this.latitudeField];
                const lng = record[this.longitudeField];

                return (
                    lat !== false &&
                    lat !== null &&
                    lat !== undefined &&
                    lng !== false &&
                    lng !== null &&
                    lng !== undefined
                );
            });
        }
    }
}