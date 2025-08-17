Protobuf reference and generated docs
=====================================

This page explains how protobuf messages are used and how to generate HTML
reference docs for the ``telemetry.proto`` definitions.

Proto files of interest
-----------------------

- Backend canonical proto: ``Software/backend-processing/proto/telemetry.proto``
- Frontend copy: ``Software/telemetry-app/public/proto/telemetry.proto``

Generating language bindings
---------------------------

- Go: ``protoc --go_out=. --go_opt=paths=source_relative telemetry.proto``
- JS (optional): ``protoc --js_out=import_style=commonjs,binary:./out telemetry.proto``

Generating HTML documentation (proto docs)
-----------------------------------------

You can use ``protoc-gen-doc`` to generate HTML or Markdown documentation for
proto files.

1. Install the plugin (example using prebuilt binary):

   - Download protoc-gen-doc and place it on your PATH.

2. Run the generator:

   .. code-block:: bash

     cd Software/backend-processing/proto
     protoc --doc_out=./doc --doc_opt=html,telemetry-proto.html telemetry.proto

3. The file ``telemetry-proto.html`` will appear in ``proto/doc``. You can
   copy or include this file into the Sphinx site (``docs/_static``) and link
   to it from this page.

Embedding proto reference into Sphinx
------------------------------------

- Option A: copy generated HTML into ``docs/_static`` and link with
  ``.. raw:: html`` or a standard link.
- Option B: generate Markdown via protoc-gen-doc and include it in the site.

Notes
-----

Protobuf changes must be coordinated between backend and frontend. The frontend
expects the same proto definitions to decode binary payloads over WebSocket.
