"use strict";

const fs = require( 'fs' );
const path = require( 'path' );

const k8s_linode_template_generator = {
	
	"prepareTFVariablesFile": (cb) => {
		const linode_api_token = process.argv[ 2 ];
		
		if ( !linode_api_token || linode_api_token.trim() === '' ) {
			let errMsg = 'Unable to proceed without the Linode API Token.\n';
			errMsg += 'Example:\n';
			errMsg += 'node run.js %linode_api_token% %k8s_namespace_value%';
			
			return cb( new Error( errMsg ) );
		}
		
		let tfVarsTemplate = path.normalize( path.join( __dirname, 'terraform.tfvars.tmpl' ) )
		let tfVarsOutput = path.normalize( path.join( __dirname, 'terraform.tfvars' ) )
		fs.readFile( tfVarsTemplate, { encoding: 'utf8' }, ( error, data ) => {
			if ( error ) {
				return cb( error );
			}
			
			data = data.replace( '%LINODE_API_TOKEN%', linode_api_token );
			fs.writeFile( tfVarsOutput, data, { encoding: 'utf8' }, ( error ) => {
				if ( error ) {
					return cb( error );
				}
				
				return cb( null, true );
			} );
		} );
	},
	
	"prepareRBACK8sFile": (cb) => {
		const k8s_namespace_value = process.argv[ 3 ];
		
		if ( !k8s_namespace_value || k8s_namespace_value.trim() === '' ) {
			let errMsg = 'Unable to proceed without the Kubernetes Namespace Value.\n';
			errMsg += 'Example:\n';
			errMsg += 'node run.js %linode_api_token% %k8s_namespace_value%';
			
			return cb( new Error( errMsg ) );
		}
		
		let rbacTemplate = path.normalize( path.join( __dirname, '/../k8s/rbac/rbac-tmpl.yaml' ) )
		let rbacOutput = path.normalize( path.join( __dirname, 'create-rbac.yaml' ) )
		fs.readFile( rbacTemplate, { encoding: 'utf8' }, ( error, data ) => {
			if ( error ) {
				return cb( error );
			}
			
			data = data.replace( '%K8S_NAMESPACE%', k8s_namespace_value );
			fs.writeFile( rbacOutput, data, { encoding: 'utf8' }, ( error ) => {
				if ( error ) {
					return cb( error );
				}
				
				return cb( null, true );
			} );
		} );
	}
};

k8s_linode_template_generator.prepareTFVariablesFile( ( error ) => {
	if ( error ) {
		throw error;
	}
	
	k8s_linode_template_generator.prepareRBACK8sFile( ( error ) => {
		if ( error ) {
			throw error;
		}
	} );
} );
