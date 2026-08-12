from odoo import models, fields, api
from odoo.exceptions import UserError, ValidationError

class ViewMapAction(models.Model):
    _inherit = "ir.actions.act_window.view"
    
    view_mode = fields.Selection(selection_add=[('map','map')],ondelete={'map':'cascade'})
    