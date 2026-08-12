from odoo import models, fields, api
from odoo.exceptions import UserError, ValidationError

class ViewMapUi(models.Model):
    _inherit = "ir.ui.view"
    
    type = fields.Selection(selection_add=[('map','Map')])
    def _is_qweb_based_view(self, view_type):
        """إعلام أودو بأن عرض الخريطة هو عرض Owl/Qweb حديث"""
        return view_type == "map" or super()._is_qweb_based_view(view_type)

    def _get_view_info(self):
        """تسجيل أيقونة العرض في شريط التنقل العلوي"""
        return {'map': {'icon': 'fa fa-map-marker'}} | super()._get_view_info()