/** @odoo-module **/

import {
    Component,
    onWillStart,
} from "@odoo/owl";

import { Layout } from "@web/search/layout";
import { useService } from "@web/core/utils/hooks";
import { useState } from "@odoo/owl";

import { MapRenderer } from "./map_renderer";

export class MapController extends Component {
    static template = "bsd_base_map.MapController";

    static components = {
        Layout,
        MapRenderer,
    };

    static props = {
        "*": true,
    };

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");

        this.model = useState(
            new this.props.Model(
                this.orm,
                this.props.resModel,
                this.props.fields,
                this.props.archInfo,
                this.props.domain
            )
        );

        onWillStart(async () => {
            await this.model.load();
        });
    }

    openRecord(record) {
        this.action.switchView("form", {
            resId: record.id,
        });
    }
}