# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Odoo Map View Base',
    'version': '19.0.1.0.0',
    'category': 'Hidden',
    'sequence': 0,
    'summary': 'Show Map for odoo',
    'depends': ['base','web'],
    'data': [
        'security/ir.model.access.csv',
        
        ],
    'assets':{
        'web.assets_backend':[],
        'web.report.assets_common':[],
    },
    'demo': [],
    # 'images': ['static/description/banner.jpg'],
    'installable': True,
    'application': False,
    'author': 'Basaad.co',
    'company': 'Basaad.co',
    'maintainer': 'Basaad.co',    
    'website': 'Basaad.co',
    'license': 'LGPL-3',
}
