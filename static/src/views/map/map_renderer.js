/** @odoo-module **/

import { Component, onMounted, onWillUnmount, useRef, useEffect } from "@odoo/owl";

export class MapRenderer extends Component {
    static template = "bsd_base_map.MapRenderer";

    static props = {
        model: Object,
        openRecord: Function,
    };

    setup() {
        this.mapContainerRef = useRef("mapContainer");
        this.leafletMap = null;
        this.markers = [];

        onMounted(() => {
            this.initMap();
            this.updateMarkers();
        });

        useEffect(
            () => {
                if (this.leafletMap) {
                    this.updateMarkers();
                }
            },
            () => [this.props.model.records]
        );

        onWillUnmount(() => {
            if (this.leafletMap) {
                this.leafletMap.remove();
                this.leafletMap = null;
            }
        });
    }

    initMap() {
        const container = this.mapContainerRef.el;
        if (!container) {
            return;
        }

        const L = window.L;
        if (!L) {
            throw new Error(
                "Leaflet is not loaded. Add leaflet.js before the map module in web.assets_backend."
            );
        }

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: "/bsd_base_map/static/lib/leaflet/images/marker-icon.png",
            iconRetinaUrl: "/bsd_base_map/static/lib/leaflet/images/marker-icon-2x.png",
            shadowUrl: "/bsd_base_map/static/lib/leaflet/images/marker-shadow.png",
        });

        this.leafletMap = L.map(container).setView([24.7136, 46.6753], 6);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(this.leafletMap);
    }

    updateMarkers() {
        if (!this.leafletMap) {
            return;
        }

        const L = window.L;
        if (!L) {
            return;
        }

        this.markers.forEach((marker) => marker.remove());
        this.markers = [];

        const records = this.props.model.records || [];
        const latField = this.props.model.latitudeField;
        const lngField = this.props.model.longitudeField;
        const bounds = [];

        if (!latField || !lngField) {
            return;
        }

        records.forEach((record) => {
            const lat = Number(record[latField]);
            const lng = Number(record[lngField]);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
            }

            const marker = L.marker([lat, lng]).addTo(this.leafletMap);

            marker.bindPopup(
                `<b>${this.escapeHtml(record.display_name || "")}</b>`
            );

            marker.on("click", () => {
                if (this.props.openRecord) {
                    this.props.openRecord(record);
                }
            });

            this.markers.push(marker);
            bounds.push([lat, lng]);
        });

        if (bounds.length === 1) {
            this.leafletMap.setView(bounds[0], 14);
        } else if (bounds.length > 1) {
            this.leafletMap.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
}
