/** @odoo-module **/

import {
    Component,
    onMounted,
    onWillUnmount,
    useRef,
    useEffect,
} from "@odoo/owl";

export class MapRenderer extends Component {
    static template = "bsd_base_map.MapRenderer";

    static props = {
        model: Object,
        openRecord: Function,
    };

    setup() {
        // =====================================================
        // References
        // =====================================================

        this.mapContainerRef = useRef("mapContainer");

        // =====================================================
        // Map instances
        // =====================================================

        this.leafletMap = null;
        this.mapLibreMap = null;

        // =====================================================
        // Current state
        // =====================================================

        this.currentMode = "2d";
        this.currentTheme = "light";

        // =====================================================
        // Markers
        // =====================================================

        this.markers = [];

        // =====================================================
        // Saved position
        // =====================================================

        this.savedCenter = [
            24.736223849475333,
            46.63582035633794,
        ];

        this.savedZoom = 6;

        // =====================================================
        // Controls
        // =====================================================

        this.controls = null;

        this.themeButtons = {};
        this.viewButtons = {};

        // =====================================================
        // Prevent repeated fit
        // =====================================================

        this.initialFitDone = false;

        // =====================================================
        // Mounted
        // =====================================================

        onMounted(() => {
            this.initLeaflet();
            this.createControls();
            this.updateMarkers();
        });

        // =====================================================
        // Records changed
        // =====================================================

        useEffect(
            () => {
                if (
                    this.leafletMap ||
                    this.mapLibreMap
                ) {
                    this.updateMarkers();
                }
            },
            () => [
                this.props.model.records,
            ]
        );

        // =====================================================
        // Unmount
        // =====================================================

        onWillUnmount(() => {
            this.destroyAllMaps();
        });
    }

    // =========================================================
    // LEAFLET 2D
    // =========================================================

    initLeaflet() {
        const container = this.mapContainerRef.el;

        if (!container) {
            return;
        }

        const L = window.L;

        if (!L) {
            return;
        }

        if (this.leafletMap) {
            return;
        }

        container.style.position = "relative";

        // -----------------------------------------------------
        // Leaflet marker icons
        // -----------------------------------------------------

        if (
            L.Icon &&
            L.Icon.Default
        ) {
            delete L.Icon.Default.prototype._getIconUrl;

            L.Icon.Default.mergeOptions({
                iconUrl:
                    "/bsd_base_map/static/lib/leaflet/images/marker-icon.png",

                iconRetinaUrl:
                    "/bsd_base_map/static/lib/leaflet/images/marker-icon-2x.png",

                shadowUrl:
                    "/bsd_base_map/static/lib/leaflet/images/marker-shadow.png",
            });
        }

        // -----------------------------------------------------
        // Create Leaflet map
        // -----------------------------------------------------

        try {
            this.leafletMap = L.map(
                container,
                {
                    zoomControl: true,
                    attributionControl: true,
                    preferCanvas: true,
                }
            );
        } catch {
            return;
        }

        // -----------------------------------------------------
        // Initial position
        // -----------------------------------------------------

        try {
            this.leafletMap.setView(
                this.savedCenter,
                this.savedZoom
            );
        } catch {
            // Ignore
        }

        // -----------------------------------------------------
        // Tiles
        // -----------------------------------------------------

        this.setLeafletTheme();

        // -----------------------------------------------------
        // Save position
        // -----------------------------------------------------

        this.leafletMap.on(
            "moveend",
            () => {
                this.saveLeafletPosition();
            }
        );

        this.leafletMap.on(
            "zoomend",
            () => {
                this.saveLeafletPosition();
            }
        );

        // -----------------------------------------------------
        // Fix Leaflet size
        // -----------------------------------------------------

        setTimeout(
            () => {
                if (this.leafletMap) {
                    try {
                        this.leafletMap.invalidateSize();
                    } catch {
                        // Ignore
                    }
                }
            },
            100
        );
    }

    // =========================================================
    // LEAFLET LIGHT / DARK
    // =========================================================

    setLeafletTheme() {
        if (!this.leafletMap) {
            return;
        }

        const L = window.L;

        if (!L) {
            return;
        }

        // -----------------------------------------------------
        // Remove existing tile layers
        // -----------------------------------------------------

        try {
            this.leafletMap.eachLayer(
                (layer) => {
                    if (
                        layer instanceof L.TileLayer
                    ) {
                        this.leafletMap.removeLayer(layer);
                    }
                }
            );
        } catch {
            // Ignore
        }

        let url;
        let options;

        // -----------------------------------------------------
        // Dark
        // -----------------------------------------------------

        if (
            this.currentTheme === "dark"
        ) {
            url =
                "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

            options = {
                subdomains: "abcd",
                maxZoom: 20,
                attribution:
                    "&copy; OpenStreetMap contributors &copy; CARTO",
            };
        }

        // -----------------------------------------------------
        // Light
        // -----------------------------------------------------

        else {
            url =
                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

            options = {
                maxZoom: 19,
                attribution:
                    "&copy; OpenStreetMap contributors",
            };
        }

        try {
            L.tileLayer(
                url,
                options
            ).addTo(
                this.leafletMap
            );
        } catch {
            // Ignore tile layer errors
        }
    }

    // =========================================================
    // MAPLIBRE 3D
    // =========================================================

    async initMapLibre() {
        const container =
            this.mapContainerRef.el;

        if (!container) {
            return;
        }

        const maplibregl =
            window.maplibregl;

        if (!maplibregl) {
            return;
        }

        if (this.mapLibreMap) {
            return;
        }

        // -----------------------------------------------------
        // Correct OpenFreeMap styles
        // -----------------------------------------------------

        const style =
            this.currentTheme === "dark"
                ? "https://tiles.openfreemap.org/styles/dark"
                : "https://tiles.openfreemap.org/styles/liberty";

        // -----------------------------------------------------
        // Create MapLibre
        // -----------------------------------------------------

        try {
            this.mapLibreMap =
                new maplibregl.Map({
                    container: container,

                    style: style,

                    center: [
                        this.savedCenter[1],
                        this.savedCenter[0],
                    ],

                    zoom:
                        this.savedZoom,

                    pitch: 55,

                    bearing: 0,

                    attributionControl:
                        true,

                    fadeDuration: 0,
                });
        } catch {
            this.mapLibreMap = null;
            return;
        }

        // -----------------------------------------------------
        // Navigation controls
        // -----------------------------------------------------

        try {
            this.mapLibreMap.addControl(
                new maplibregl.NavigationControl({
                    showCompass: true,
                    showZoom: true,
                }),
                "top-left"
            );
        } catch {
            // Ignore
        }

        // -----------------------------------------------------
        // Map load
        // -----------------------------------------------------

        await new Promise(
            (resolve) => {
                if (!this.mapLibreMap) {
                    resolve();
                    return;
                }

                let resolved = false;

                const finish = () => {
                    if (resolved) {
                        return;
                    }

                    resolved = true;
                    resolve();
                };

                this.mapLibreMap.once(
                    "load",
                    () => {
                        if (!this.mapLibreMap) {
                            finish();
                            return;
                        }

                        this.enable3DBuildings();

                        this.saveMapLibrePosition();

                        this.updateMarkers();

                        finish();
                    }
                );

                // -------------------------------------------------
                // Style / source errors are intentionally ignored.
                // They are handled by MapLibre internally.
                // -------------------------------------------------

                this.mapLibreMap.on(
                    "error",
                    (event) => {
                        if (
                            event &&
                            event.error
                        ) {
                            // Intentionally silent.
                        }
                    }
                );

                // -------------------------------------------------
                // Safety timeout
                // -------------------------------------------------

                setTimeout(
                    finish,
                    10000
                );
            }
        );
    }

    // =========================================================
    // 3D BUILDINGS
    // =========================================================

    enable3DBuildings() {
        if (!this.mapLibreMap) {
            return;
        }

        const map =
            this.mapLibreMap;

        let style;

        try {
            style = map.getStyle();
        } catch {
            return;
        }

        if (
            !style ||
            !Array.isArray(style.layers)
        ) {
            return;
        }

        // -----------------------------------------------------
        // Already exists
        // -----------------------------------------------------

        const existingExtrusion =
            style.layers.find(
                (layer) =>
                    layer &&
                    layer.type ===
                        "fill-extrusion"
            );

        if (existingExtrusion) {
            try {
                map.setLayoutProperty(
                    existingExtrusion.id,
                    "visibility",
                    "visible"
                );
            } catch {
                // Ignore
            }

            return;
        }

        // -----------------------------------------------------
        // Find building layer
        // -----------------------------------------------------

        const buildingLayer =
            style.layers.find(
                (layer) => {
                    if (!layer) {
                        return false;
                    }

                    const id =
                        String(
                            layer.id || ""
                        ).toLowerCase();

                    const sourceLayer =
                        String(
                            layer[
                                "source-layer"
                            ] || ""
                        ).toLowerCase();

                    return (
                        sourceLayer ===
                            "building" ||
                        id.includes(
                            "building"
                        )
                    );
                }
            );

        if (!buildingLayer) {
            return;
        }

        if (
            !buildingLayer.source ||
            !buildingLayer[
                "source-layer"
            ]
        ) {
            return;
        }

        // -----------------------------------------------------
        // Add extrusion
        // -----------------------------------------------------

        const extrusionId =
            "bsd-3d-buildings";

        try {
            if (
                map.getLayer(
                    extrusionId
                )
            ) {
                return;
            }
        } catch {
            // Ignore
        }

        try {
            map.addLayer({
                id:
                    extrusionId,

                type:
                    "fill-extrusion",

                source:
                    buildingLayer.source,

                "source-layer":
                    buildingLayer[
                        "source-layer"
                    ],

                minzoom: 13,

                paint: {
                    "fill-extrusion-color":
                        this.currentTheme ===
                            "dark"
                            ? "#30343b"
                            : "#d9d9d9",

                    "fill-extrusion-height":
                        [
                            "coalesce",

                            [
                                "get",
                                "render_height",
                            ],

                            [
                                "get",
                                "height",
                            ],

                            10,
                        ],

                    "fill-extrusion-base":
                        [
                            "coalesce",

                            [
                                "get",
                                "render_min_height",
                            ],

                            [
                                "get",
                                "min_height",
                            ],

                            0,
                        ],

                    "fill-extrusion-opacity":
                        0.85,
                },
            });
        } catch {
            // Building extrusion is optional.
        }
    }

    // =========================================================
    // SAVE MAPLIBRE POSITION
    // =========================================================

    saveMapLibrePosition() {
        if (!this.mapLibreMap) {
            return;
        }

        try {
            const center =
                this.mapLibreMap.getCenter();

            this.savedCenter = [
                center.lat,
                center.lng,
            ];

            this.savedZoom =
                this.mapLibreMap.getZoom();
        } catch {
            // Ignore
        }
    }

    // =========================================================
    // CONTROLS
    // =========================================================

    createControls() {
        const container =
            this.mapContainerRef.el;

        if (!container) {
            return;
        }

        const oldControls =
            container.querySelector(
                ".o_bsd_map_controls"
            );

        if (oldControls) {
            oldControls.remove();
        }

        const controls =
            document.createElement(
                "div"
            );

        controls.className =
            "o_bsd_map_controls";

        Object.assign(
            controls.style,
            {
                position: "absolute",

                left: "10px",

                top: "120px",

                zIndex: "10000",

                display: "flex",

                flexDirection:
                    "column",

                gap: "6px",

                direction: "ltr",

                pointerEvents:
                    "auto",
            }
        );

        // -----------------------------------------------------
        // Theme
        // -----------------------------------------------------

        const themeGroup =
            document.createElement(
                "div"
            );

        Object.assign(
            themeGroup.style,
            {
                display: "flex",

                flexDirection:
                    "column",

                gap: "4px",
            }
        );

        const lightButton =
            this.createButton(
                "☀️",
                "الوضع النهاري"
            );

        const darkButton =
            this.createButton(
                "🌙",
                "الوضع الليلي"
            );

        lightButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.setTheme(
                    "light"
                );
            }
        );

        darkButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.setTheme(
                    "dark"
                );
            }
        );

        themeGroup.appendChild(
            lightButton
        );

        themeGroup.appendChild(
            darkButton
        );

        // -----------------------------------------------------
        // View
        // -----------------------------------------------------

        const viewGroup =
            document.createElement(
                "div"
            );

        Object.assign(
            viewGroup.style,
            {
                display: "flex",

                flexDirection:
                    "column",

                gap: "4px",
            }
        );

        const twoDButton =
            this.createButton(
                "2D",
                "الخريطة ثنائية الأبعاد"
            );

        const threeDButton =
            this.createButton(
                "3D",
                "الخريطة ثلاثية الأبعاد"
            );

        twoDButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.setMode(
                    "2d"
                );
            }
        );

        threeDButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.setMode(
                    "3d"
                );
            }
        );

        viewGroup.appendChild(
            twoDButton
        );

        viewGroup.appendChild(
            threeDButton
        );

        // -----------------------------------------------------
        // Add controls
        // -----------------------------------------------------

        controls.appendChild(
            themeGroup
        );

        controls.appendChild(
            viewGroup
        );

        container.appendChild(
            controls
        );

        // -----------------------------------------------------
        // References
        // -----------------------------------------------------

        this.controls =
            controls;

        this.themeButtons = {
            light:
                lightButton,

            dark:
                darkButton,
        };

        this.viewButtons = {
            "2d":
                twoDButton,

            "3d":
                threeDButton,
        };

        this.updateButtons();
    }

    // =========================================================
    // BUTTON
    // =========================================================

    createButton(
        text,
        title
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.className =
            "o_bsd_map_mode_button";

        button.textContent =
            text;

        button.title =
            title;

        Object.assign(
            button.style,
            {
                width: "42px",

                height: "38px",

                padding: "0",

                border:
                    "1px solid rgba(0,0,0,0.18)",

                borderRadius: "6px",

                background: "#ffffff",

                color: "#333333",

                fontSize: "16px",

                fontWeight: "600",

                cursor: "pointer",

                display: "flex",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                boxShadow:
                    "0 2px 6px rgba(0,0,0,0.25)",

                pointerEvents:
                    "auto",
            }
        );

        return button;
    }

    // =========================================================
    // THEME
    // =========================================================

    async setTheme(
        theme
    ) {
        if (
            theme !== "light" &&
            theme !== "dark"
        ) {
            return;
        }

        if (
            theme ===
            this.currentTheme
        ) {
            return;
        }

        this.currentTheme =
            theme;

        // -----------------------------------------------------
        // Leaflet
        // -----------------------------------------------------

        if (
            this.currentMode ===
            "2d"
        ) {
            this.setLeafletTheme();
        }

        // -----------------------------------------------------
        // MapLibre
        // -----------------------------------------------------

        else {
            this.saveMapLibrePosition();

            this.destroyMapLibre();

            await this.initMapLibre();
        }

        this.updateButtons();
    }

    // =========================================================
    // MODE
    // =========================================================

    async setMode(
        mode
    ) {
        if (
            mode !== "2d" &&
            mode !== "3d"
        ) {
            return;
        }

        if (
            mode ===
            this.currentMode
        ) {
            return;
        }

        // -----------------------------------------------------
        // Save position
        // -----------------------------------------------------

        this.saveCurrentPosition();

        // -----------------------------------------------------
        // 2D -> 3D
        // -----------------------------------------------------

        if (
            mode === "3d"
        ) {
            this.destroyLeaflet();

            this.currentMode =
                "3d";

            await this.initMapLibre();
        }

        // -----------------------------------------------------
        // 3D -> 2D
        // -----------------------------------------------------

        else {
            this.destroyMapLibre();

            this.currentMode =
                "2d";

            this.initLeaflet();

            if (
                this.leafletMap
            ) {
                try {
                    this.leafletMap.setView(
                        this.savedCenter,
                        this.savedZoom
                    );
                } catch {
                    // Ignore
                }
            }
        }

        this.updateButtons();

        this.updateMarkers();
    }

    // =========================================================
    // SAVE POSITION
    // =========================================================

    saveCurrentPosition() {
        if (
            this.leafletMap
        ) {
            this.saveLeafletPosition();
            return;
        }

        if (
            this.mapLibreMap
        ) {
            this.saveMapLibrePosition();
        }
    }

    // =========================================================
    // LEAFLET POSITION
    // =========================================================

    saveLeafletPosition() {
        if (!this.leafletMap) {
            return;
        }

        try {
            const center =
                this.leafletMap.getCenter();

            this.savedCenter = [
                center.lat,
                center.lng,
            ];

            this.savedZoom =
                this.leafletMap.getZoom();
        } catch {
            // Ignore
        }
    }

    // =========================================================
    // MARKERS
    // =========================================================

    updateMarkers() {
        this.clearMarkers();

        const records =
            this.props.model.records || [];

        const latField =
            this.props.model.latitudeField;

        const lngField =
            this.props.model.longitudeField;

        if (
            !latField ||
            !lngField
        ) {
            return;
        }

        // -----------------------------------------------------
        // Group by coordinates
        // -----------------------------------------------------

        const locations =
            new Map();

        records.forEach(
            (record) => {
                const latValue =
                    record[latField];

                const lngValue =
                    record[lngField];

                if (
                    latValue === false ||
                    latValue === null ||
                    latValue === undefined ||
                    lngValue === false ||
                    lngValue === null ||
                    lngValue === undefined
                ) {
                    return;
                }

                const lat =
                    Number(
                        latValue
                    );

                const lng =
                    Number(
                        lngValue
                    );

                if (
                    Number.isNaN(lat) ||
                    Number.isNaN(lng)
                ) {
                    return;
                }

                const key =
                    `${lat},${lng}`;

                if (
                    !locations.has(
                        key
                    )
                ) {
                    locations.set(
                        key,
                        {
                            lat:
                                lat,

                            lng:
                                lng,

                            records:
                                [],
                        }
                    );
                }

                locations
                    .get(key)
                    .records
                    .push(
                        record
                    );
            }
        );

        // -----------------------------------------------------
        // Create markers
        // -----------------------------------------------------

        locations.forEach(
            (location) => {
                if (
                    this.currentMode ===
                    "2d"
                ) {
                    this.createLeafletMarker(
                        location
                    );
                } else {
                    this.createMapLibreMarker(
                        location
                    );
                }
            }
        );

        // -----------------------------------------------------
        // Fit once
        // -----------------------------------------------------

        if (
            !this.initialFitDone
        ) {
            this.fitMapToMarkers(
                locations
            );

            this.initialFitDone =
                true;
        }
    }

    // =========================================================
    // LEAFLET MARKER
    // =========================================================

    createLeafletMarker(
        location
    ) {
        if (!this.leafletMap) {
            return;
        }

        const L =
            window.L;

        if (!L) {
            return;
        }

        let marker;

        try {
            marker =
                L.marker(
                    [
                        location.lat,
                        location.lng,
                    ]
                );
        } catch {
            return;
        }

        const popupHTML =
            this.createPopupHTML(
                location.records
            );

        try {
            marker.bindPopup(
                popupHTML,
                {
                    maxWidth: 380,

                    minWidth: 260,

                    className:
                        "bsd-map-leaflet-popup",

                    closeButton:
                        true,

                    autoPan:
                        true,

                    direction:
                        "rtl",
                }
            );
        } catch {
            // Ignore
        }

        marker.on(
            "popupopen",
            (event) => {
                this.attachPopupEvents(
                    event.popup.getElement(),
                    location.records,
                    () => {
                        event.popup.close();
                    }
                );
            }
        );

        try {
            marker.addTo(
                this.leafletMap
            );
        } catch {
            return;
        }

        this.markers.push(
            marker
        );
    }

    // =========================================================
    // MAPLIBRE MARKER
    // =========================================================

    createMapLibreMarker(
        location
    ) {
        if (!this.mapLibreMap) {
            return;
        }

        const maplibregl =
            window.maplibregl;

        if (!maplibregl) {
            return;
        }

        const element =
            document.createElement(
                "div"
            );

        element.className =
            "o_bsd_map_marker";

        Object.assign(
            element.style,
            {
                width: "34px",

                height: "34px",

                borderRadius:
                    "50%",

                background:
                    "#714B67",

                border:
                    "3px solid #ffffff",

                boxShadow:
                    "0 2px 8px rgba(0,0,0,.35)",

                cursor:
                    "pointer",

                display:
                    "flex",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                color:
                    "#ffffff",

                fontWeight:
                    "700",

                fontSize:
                    "12px",
            }
        );

        if (
            location.records.length > 1
        ) {
            element.textContent =
                String(
                    location.records.length
                );
        }

        let popup;

        try {
            popup =
                new maplibregl.Popup(
                    {
                        offset: 22,

                        maxWidth:
                            "380px",

                        closeButton:
                            true,

                        closeOnClick:
                            true,
                    }
                );
        } catch {
            return;
        }

        element.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                try {
                    popup
                        .setLngLat(
                            [
                                location.lng,
                                location.lat,
                            ]
                        )
                        .setHTML(
                            this.createPopupHTML(
                                location.records
                            )
                        )
                        .addTo(
                            this.mapLibreMap
                        );

                    requestAnimationFrame(
                        () => {
                            this.attachPopupEvents(
                                popup.getElement(),
                                location.records,
                                () => {
                                    popup.remove();
                                }
                            );
                        }
                    );
                } catch {
                    // Ignore
                }
            }
        );

        let marker;

        try {
            marker =
                new maplibregl.Marker(
                    {
                        element:
                            element,

                        anchor:
                            "bottom",
                    }
                )
                    .setLngLat(
                        [
                            location.lng,
                            location.lat,
                        ]
                    )
                    .addTo(
                        this.mapLibreMap
                    );
        } catch {
            return;
        }

        this.markers.push(
            marker
        );
    }

    // =========================================================
    // POPUP HTML
    // =========================================================

    createPopupHTML(
        records
    ) {
        let html = `
            <div
                class="o_bsd_map_popup"
                dir="rtl"
                style="
                    direction: rtl;
                    text-align: right;
                    unicode-bidi: plaintext;
                    font-family: Arial, sans-serif;
                "
            >

                <div
                    style="
                        direction: rtl;
                        text-align: right;
                        font-weight: 700;
                        margin-bottom: 10px;
                    "
                >
                    العقارات في هذا الموقع:
                    ${records.length}
                </div>
        `;

        records.forEach(
            (record, index) => {
                const id =
                    record.id;

                const name =
                    record.display_name ||
                    `العقار ${index + 1}`;

                html += `
                    <div
                        style="
                            direction: rtl;
                            text-align: right;
                            margin-bottom: 8px;
                        "
                    >

                        <a
                            href="#"
                            class="o_bsd_map_record"
                            data-record-id="${this.escapeHtml(id)}"
                            dir="rtl"
                            style="
                                direction: rtl;
                                text-decoration: none;
                                cursor: pointer;
                                display: block;
                            "
                        >

                            <span
                                style="
                                    direction: ltr;
                                    unicode-bidi: embed;
                                    font-weight: 700;
                                    margin-left: 5px;
                                "
                            >
                                #${this.escapeHtml(id)}
                            </span>

                            <span
                                dir="rtl"
                                style="
                                    direction: rtl;
                                    unicode-bidi: plaintext;
                                "
                            >
                                ${this.escapeHtml(name)}
                            </span>

                        </a>

                    </div>
                `;
            }
        );

        html += `
            </div>
        `;

        return html;
    }

    // =========================================================
    // POPUP EVENTS
    // =========================================================

    attachPopupEvents(
        element,
        records,
        closePopup
    ) {
        if (!element) {
            return;
        }

        const links =
            element.querySelectorAll(
                ".o_bsd_map_record"
            );

        links.forEach(
            (link) => {
                link.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        const id =
                            Number(
                                link.dataset.recordId
                            );

                        const record =
                            records.find(
                                (item) =>
                                    Number(
                                        item.id
                                    ) === id
                            );

                        if (
                            record &&
                            typeof this.props.openRecord ===
                                "function"
                        ) {
                            if (
                                closePopup
                            ) {
                                closePopup();
                            }

                            this.props.openRecord(
                                record
                            );
                        }
                    }
                );
            }
        );
    }

    // =========================================================
    // FIT MAP
    // =========================================================

    fitMapToMarkers(
        locations
    ) {
        if (
            !locations ||
            locations.size === 0
        ) {
            return;
        }

        const points =
            Array.from(
                locations.values()
            );

        // -----------------------------------------------------
        // Leaflet
        // -----------------------------------------------------

        if (
            this.currentMode ===
                "2d" &&
            this.leafletMap
        ) {
            const L =
                window.L;

            if (!L) {
                return;
            }

            try {
                if (
                    points.length === 1
                ) {
                    this.leafletMap.setView(
                        [
                            points[0].lat,
                            points[0].lng,
                        ],
                        13
                    );
                } else {
                    const bounds =
                        L.latLngBounds(
                            points.map(
                                (point) => [
                                    point.lat,
                                    point.lng,
                                ]
                            )
                        );

                    this.leafletMap.fitBounds(
                        bounds,
                        {
                            padding:
                                [
                                    50,
                                    50,
                                ],
                        }
                    );
                }
            } catch {
                // Ignore
            }

            return;
        }

        // -----------------------------------------------------
        // MapLibre
        // -----------------------------------------------------

        if (
            this.currentMode ===
                "3d" &&
            this.mapLibreMap
        ) {
            const maplibregl =
                window.maplibregl;

            if (!maplibregl) {
                return;
            }

            try {
                if (
                    points.length === 1
                ) {
                    this.mapLibreMap.easeTo(
                        {
                            center:
                                [
                                    points[0].lng,
                                    points[0].lat,
                                ],

                            zoom:
                                14,

                            pitch:
                                55,

                            duration:
                                500,
                        }
                    );
                } else {
                    const bounds =
                        new maplibregl.LngLatBounds();

                    points.forEach(
                        (point) => {
                            bounds.extend(
                                [
                                    point.lng,
                                    point.lat,
                                ]
                            );
                        }
                    );

                    this.mapLibreMap.fitBounds(
                        bounds,
                        {
                            padding:
                                70,

                            pitch:
                                55,

                            duration:
                                500,
                        }
                    );
                }
            } catch {
                // Ignore
            }
        }
    }

    // =========================================================
    // CLEAR MARKERS
    // =========================================================

    clearMarkers() {
        this.markers.forEach(
            (marker) => {
                if (
                    marker &&
                    typeof marker.remove ===
                        "function"
                ) {
                    try {
                        marker.remove();
                    } catch {
                        // Ignore
                    }
                }
            }
        );

        this.markers = [];
    }

    // =========================================================
    // BUTTON STATES
    // =========================================================

    updateButtons() {
        if (
            this.themeButtons.light
        ) {
            this.setButtonState(
                this.themeButtons.light,
                this.currentTheme ===
                    "light"
            );
        }

        if (
            this.themeButtons.dark
        ) {
            this.setButtonState(
                this.themeButtons.dark,
                this.currentTheme ===
                    "dark"
            );
        }

        if (
            this.viewButtons["2d"]
        ) {
            this.setButtonState(
                this.viewButtons["2d"],
                this.currentMode ===
                    "2d"
            );
        }

        if (
            this.viewButtons["3d"]
        ) {
            this.setButtonState(
                this.viewButtons["3d"],
                this.currentMode ===
                    "3d"
            );
        }
    }

    // =========================================================
    // BUTTON STATE
    // =========================================================

    setButtonState(
        button,
        active
    ) {
        if (!button) {
            return;
        }

        if (active) {
            button.style.background =
                "#714B67";

            button.style.color =
                "#ffffff";

            button.style.borderColor =
                "#714B67";
        } else {
            button.style.background =
                "#ffffff";

            button.style.color =
                "#333333";

            button.style.borderColor =
                "rgba(0,0,0,0.18)";
        }
    }

    // =========================================================
    // ESCAPE HTML
    // =========================================================

    escapeHtml(
        value
    ) {
        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }

    // =========================================================
    // DESTROY LEAFLET
    // =========================================================

    destroyLeaflet() {
        if (!this.leafletMap) {
            return;
        }

        this.clearMarkers();

        try {
            this.leafletMap.remove();
        } catch {
            // Ignore
        }

        this.leafletMap =
            null;
    }

    // =========================================================
    // DESTROY MAPLIBRE
    // =========================================================

    destroyMapLibre() {
        if (!this.mapLibreMap) {
            return;
        }

        this.clearMarkers();

        try {
            this.mapLibreMap.remove();
        } catch {
            // Ignore
        }

        this.mapLibreMap =
            null;
    }

    // =========================================================
    // DESTROY ALL
    // =========================================================

    destroyAllMaps() {
        this.clearMarkers();

        this.destroyLeaflet();

        this.destroyMapLibre();

        if (
            this.controls
        ) {
            try {
                this.controls.remove();
            } catch {
                // Ignore
            }
        }

        this.controls =
            null;
    }
}